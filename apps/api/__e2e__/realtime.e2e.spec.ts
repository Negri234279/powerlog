import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import cookieParser from 'cookie-parser'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { AppModule } from '../src/app.module'
import { PG_POOL } from '../src/database/database.module'
import * as schema from '../src/database/schema'
import { Mailer } from '../src/mail/mailer.port'
import type { RealtimeEvent } from '../src/realtime/realtime-event'
import { FakeMailer } from '../tests/doubles/shared'

let container: StartedPostgreSqlContainer
let app: INestApplication
let pool: Pool
let baseUrl: string
let httpServer: ReturnType<INestApplication['getHttpServer']>

const COOKIE = { access: 'pl_at' }

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    const testPool = new Pool({ connectionString: container.getConnectionUri() })
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(PG_POOL)
        .useValue(testPool)
        .overrideProvider(Mailer)
        .useValue(new FakeMailer())
        .compile()

    app = moduleRef.createNestApplication({ bufferLogs: true })
    app.use(cookieParser())

    // SSE needs a real socket the test can read from as the response streams, so
    // unlike the other e2e suites this one listens on an ephemeral port and talks
    // to it with fetch (supertest buffers until the response ends — an SSE stream
    // never does).
    await app.listen(0)
    baseUrl = await app.getUrl()

    pool = app.get<Pool>(PG_POOL)
    await migrate(drizzle(pool, { schema }), { migrationsFolder: './drizzle' })
    httpServer = app.getHttpServer()
}, 180_000)

afterAll(async () => {
    await app?.close()
    await container?.stop()
})

beforeEach(async () => {
    await pool.query(
        'TRUNCATE TABLE users, profiles, coach_athlete_invitations, coach_athlete, coach_athlete_notes, notifications RESTART IDENTITY CASCADE',
    )
})

// ── helpers ───────────────────────────────────────────────────────────
function setCookies(res: request.Response): string[] {
    const raw = res.headers['set-cookie']
    return Array.isArray(raw) ? raw : raw ? [raw] : []
}

function cookiePair(cookies: string[], name: string): string | undefined {
    return cookies.find((c) => c.startsWith(`${name}=`))?.split(';')[0]
}

function gql(query: string, cookie?: string) {
    const req = request(httpServer).post('/graphql').send({ query })
    return cookie ? req.set('Cookie', cookie) : req
}

async function register(email: string): Promise<{ access: string }> {
    const username = email.split('@')[0]!.padEnd(3, '0')
    const res = await gql(
        `mutation { register(input: { email: "${email}", username: "${username}", password: "supersecret" }) { id } }`,
    )
    expect(res.body.errors).toBeUndefined()

    return { access: cookiePair(setCookies(res), COOKIE.access)! }
}

/** An open SSE connection: reads the stream in the background and resolves
 *  `next()` with each event as it arrives. */
function openStream(cookie?: string) {
    const controller = new AbortController()
    const events: RealtimeEvent[] = []
    let notify: (() => void) | null = null

    const response = fetch(`${baseUrl}/events`, {
        headers: { accept: 'text/event-stream', ...(cookie ? { cookie } : {}) },
        signal: controller.signal,
    })

    const read = response.then(async (res) => {
        if (!res.ok || !res.body) return res

        const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
        let buffer = ''

        try {
            for (;;) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += value
                // SSE frames are separated by a blank line; we only send `data:`.
                const frames = buffer.split('\n\n')
                buffer = frames.pop() ?? ''

                for (const frame of frames) {
                    const data = frame
                        .split('\n')
                        .find((line) => line.startsWith('data:'))
                        ?.slice('data:'.length)
                        .trim()
                    if (data === undefined) continue

                    events.push(JSON.parse(data) as RealtimeEvent)
                    notify?.()
                }
            }
        } catch {
            // Aborted by the test — nothing to do.
        }

        return res
    })

    return {
        status: async (): Promise<number> => (await response).status,
        /** Waits for the next event to land (rejects if none arrives in time). */
        next: async (timeoutMs = 5_000): Promise<RealtimeEvent> => {
            if (events.length > 0) return events.shift()!

            await new Promise<void>((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('no realtime event arrived in time')), timeoutMs)
                notify = () => {
                    clearTimeout(timer)
                    resolve()
                }
            })

            return events.shift()!
        },
        close: async (): Promise<void> => {
            controller.abort()
            await read.catch(() => undefined)
        },
    }
}

describe('Realtime stream (SSE)', () => {
    it('rejects an unauthenticated connection', async () => {
        const stream = openStream()

        expect(await stream.status()).toBe(401)

        await stream.close()
    })

    it('pushes the new athlete to a coach who is already on the page', async () => {
        const coach = await register('coach@example.com')
        const athlete = await register('athlete@example.com')

        const promoted = await gql(`mutation { becomeCoach { role } }`, coach.access)
        const coachAccess = cookiePair(setCookies(promoted), COOKIE.access)!

        const invited = await gql(`mutation { inviteAthlete(email: "athlete@example.com") { id } }`, coachAccess)
        const invitationId: string = invited.body.data.inviteAthlete.id

        // The coach is sitting on /coaching with the stream open…
        const coachStream = openStream(coachAccess)
        expect(await coachStream.status()).toBe(200)

        // …the athlete accepts from their own device…
        const accepted = await gql(`mutation { acceptInvitation(id: "${invitationId}") { status } }`, athlete.access)
        expect(accepted.body.errors).toBeUndefined()

        // …and the coach's page learns about it without reloading.
        expect(await coachStream.next()).toEqual({ type: 'athlete_linked' })

        await coachStream.close()
    })

    it("never leaks another user's events into a stream", async () => {
        const coach = await register('coach@example.com')
        const athlete = await register('athlete@example.com')
        const bystander = await register('bystander@example.com')

        const promoted = await gql(`mutation { becomeCoach { role } }`, coach.access)
        const coachAccess = cookiePair(setCookies(promoted), COOKIE.access)!

        const bystanderStream = openStream(bystander.access)
        expect(await bystanderStream.status()).toBe(200)

        const invited = await gql(`mutation { inviteAthlete(email: "athlete@example.com") { id } }`, coachAccess)
        await gql(
            `mutation { acceptInvitation(id: "${invited.body.data.inviteAthlete.id}") { status } }`,
            athlete.access,
        )

        // The whole coach↔athlete exchange happened; the bystander must see none of it.
        await expect(bystanderStream.next(500)).rejects.toThrow(/no realtime event/)

        await bystanderStream.close()
    })
})
