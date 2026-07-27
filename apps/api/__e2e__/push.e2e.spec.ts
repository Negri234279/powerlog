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
import { PushSubscriptionStore } from '../src/push/push-subscription-store'
import { PushTransport } from '../src/push/sender/push-transport'
import { FakePushTransport } from '../tests/doubles/push'
import { FakeMailer } from '../tests/doubles/shared'

let container: StartedPostgreSqlContainer
let app: INestApplication
let pool: Pool
let httpServer: ReturnType<INestApplication['getHttpServer']>
let store: PushSubscriptionStore

const COOKIE = { access: 'pl_at' }
const ENDPOINT = 'https://push.example.com/abc-123'

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    const testPool = new Pool({ connectionString: container.getConnectionUri() })
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(PG_POOL)
        .useValue(testPool)
        .overrideProvider(Mailer)
        .useValue(new FakeMailer())
        // A configured transport (non-null public key) so the register path runs;
        // the default test env has no VAPID keys, which is a separate unit test.
        .overrideProvider(PushTransport)
        .useValue(new FakePushTransport('e2e-public-key'))
        .compile()

    app = moduleRef.createNestApplication({ bufferLogs: true })
    app.use(cookieParser())
    await app.init()

    pool = app.get<Pool>(PG_POOL)
    await migrate(drizzle(pool, { schema }), { migrationsFolder: './drizzle' })
    httpServer = app.getHttpServer()
    store = app.get(PushSubscriptionStore)
}, 180_000)

afterAll(async () => {
    await app?.close()
    await container?.stop()
})

beforeEach(async () => {
    await pool.query('TRUNCATE TABLE users, profiles, push_subscriptions RESTART IDENTITY CASCADE')
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

function registerPush(endpoint: string, cookie: string) {
    return gql(
        `mutation { registerPushSubscription(input: { endpoint: "${endpoint}", p256dh: "p256dh-key", auth: "auth-secret", locale: "es" }) }`,
        cookie,
    )
}

describe('Web Push subscriptions via GraphQL', () => {
    it('serves the VAPID public key', async () => {
        const { access } = await registerAthlete('athlete@example.com')

        const res = await gql(`query { pushPublicKey }`, access)
        expect(res.body.data.pushPublicKey).toBe('e2e-public-key')
    })

    it('registers a subscription and upserts by endpoint (re-register keeps one row)', async () => {
        const { access, userId } = await registerAthlete('athlete@example.com')

        const first = await registerPush(ENDPOINT, access)
        expect(first.body.data.registerPushSubscription).toBe(true)

        const again = await registerPush(ENDPOINT, access)
        expect(again.body.data.registerPushSubscription).toBe(true)

        const rows = await store.findByUsers([userId])
        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({ endpoint: ENDPOINT, locale: 'es' })
    })

    it('keeps a row per device and removes only the named endpoint', async () => {
        const { access, userId } = await registerAthlete('athlete@example.com')
        await registerPush('https://push.example.com/phone', access)
        await registerPush('https://push.example.com/laptop', access)

        expect(await store.findByUsers([userId])).toHaveLength(2)

        const removed = await gql(
            `mutation { removePushSubscription(endpoint: "https://push.example.com/phone") }`,
            access,
        )
        expect(removed.body.data.removePushSubscription).toBe(true)

        const rows = await store.findByUsers([userId])
        expect(rows.map((r) => r.endpoint)).toEqual(['https://push.example.com/laptop'])
    })

    it('returns false removing an endpoint that is not the caller’s', async () => {
        const owner = await registerAthlete('owner@example.com')
        const intruder = await registerAthlete('intruder@example.com')
        await registerPush(ENDPOINT, owner.access)

        const attempt = await gql(`mutation { removePushSubscription(endpoint: "${ENDPOINT}") }`, intruder.access)
        expect(attempt.body.errors).toBeUndefined()
        expect(attempt.body.data.removePushSubscription).toBe(false)

        expect(await store.findByUsers([owner.userId])).toHaveLength(1)
    })

    it('rejects an unauthenticated caller', async () => {
        const res = await registerPush(ENDPOINT, '')
        expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED')
    })
})
