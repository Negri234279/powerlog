import type { INestApplication } from '@nestjs/common'
import { EventBus } from '@nestjs/cqrs'
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
import { CoachInvitationCreatedIntegrationEvent } from '../src/shared/integration-events/coach-invitation-created.integration-event'
import { FakeMailer } from '../tests/doubles/shared'

let container: StartedPostgreSqlContainer
let app: INestApplication
let pool: Pool
let httpServer: ReturnType<INestApplication['getHttpServer']>
let events: EventBus
let mailer: FakeMailer

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
    await app.init()

    pool = app.get<Pool>(PG_POOL)
    await migrate(drizzle(pool, { schema }), { migrationsFolder: './drizzle' })
    httpServer = app.getHttpServer()
    events = app.get(EventBus)
    mailer = app.get<FakeMailer>(Mailer)
}, 180_000)

afterAll(async () => {
    await app?.close()
    await container?.stop()
})

beforeEach(async () => {
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE')
    await pool.query('TRUNCATE TABLE notifications RESTART IDENTITY CASCADE')
    mailer.sent.length = 0
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

async function registerAthlete(email: string): Promise<{ access: string; userId: string }> {
    const username = email
        .split('@')[0]!
        .replace(/[^a-z0-9_]/g, '_')
        .padEnd(3, '0')
    const res = await gql(
        `mutation { register(input: { email: "${email}", username: "${username}", password: "supersecret" }) { id } }`,
    )
    expect(res.body.errors).toBeUndefined()
    return { access: cookiePair(setCookies(res), COOKIE.access)!, userId: res.body.data.register.id }
}

/** Polls a query until `predicate` holds (event handlers run async off the bus). */
async function eventually<T>(run: () => Promise<T>, predicate: (value: T) => boolean): Promise<T> {
    for (let i = 0; i < 40; i++) {
        const value = await run()
        if (predicate(value)) return value
        await new Promise((r) => setTimeout(r, 25))
    }
    throw new Error('condition not met in time')
}

describe('Notifications via GraphQL', () => {
    it('delivers a coach invitation to the athlete bell + email, then marks it read', async () => {
        const { access, userId } = await registerAthlete('athlete@example.com')

        events.publish(
            new CoachInvitationCreatedIntegrationEvent('inv-1', 'coach-1', userId, 'athlete@example.com', 'coachy'),
        )

        const page = await eventually(
            async () =>
                (
                    await gql(
                        `query { myNotifications(limit: 10) { items { id type data readAt } hasNextPage } }`,
                        access,
                    )
                ).body.data.myNotifications,
            (p) => p.items.length > 0,
        )
        expect(page.items[0].type).toBe('coach_invitation')
        expect(JSON.parse(page.items[0].data)).toMatchObject({ invitationId: 'inv-1', coachUsername: 'coachy' })
        expect(page.items[0].readAt).toBeNull()
        expect(mailer.sent.at(-1)?.to).toBe('athlete@example.com')

        const count = await gql(`query { unreadNotificationsCount }`, access)
        expect(count.body.data.unreadNotificationsCount).toBe(1)

        const marked = await gql(`mutation { markNotificationRead(id: "${page.items[0].id}") }`, access)
        expect(marked.body.data.markNotificationRead).toBe(true)

        const after = await gql(`query { unreadNotificationsCount }`, access)
        expect(after.body.data.unreadNotificationsCount).toBe(0)
    })

    it('rejects an unauthenticated caller', async () => {
        const res = await gql(`query { unreadNotificationsCount }`)
        expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED')
    })
})
