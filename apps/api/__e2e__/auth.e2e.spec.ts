import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import cookieParser from 'cookie-parser'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { importPKCS8, SignJWT } from 'jose'
import nock from 'nock'
import { Pool } from 'pg'
import sharp from 'sharp'
import request from 'supertest'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { AppModule } from '../src/app.module'
import { PG_POOL } from '../src/database/database.module'
import * as schema from '../src/database/schema'
import { Mailer } from '../src/mail/mailer.port'
import { FakeMailer } from '../tests/doubles/shared'

let container: StartedPostgreSqlContainer
let app: INestApplication
let pool: Pool
let httpServer: ReturnType<INestApplication['getHttpServer']>
let privateKey: Awaited<ReturnType<typeof importPKCS8>>
const mailer = new FakeMailer()

const COOKIE = { access: 'pl_at', refresh: 'pl_rt' }
const WEB_ORIGIN = 'http://localhost:3000'

beforeAll(async () => {
    // Importing nock activates http interception, which mangles dockerode's
    // requests to the Docker daemon. Keep it off until the OAuth tests opt in.
    nock.restore()
    container = await new PostgreSqlContainer('postgres:16-alpine').start()

    // The DB URL is only known now, after the container starts; everything else
    // the app reads was set by setup-env.ts before AppModule was imported. Inject
    // the real pool by overriding the PG_POOL provider.
    const testPool = new Pool({ connectionString: container.getConnectionUri() })
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(PG_POOL)
        .useValue(testPool)
        .overrideProvider(Mailer)
        .useValue(mailer)
        .compile()

    app = moduleRef.createNestApplication({ bufferLogs: true })
    app.use(cookieParser())
    await app.init()

    pool = app.get<Pool>(PG_POOL)
    await migrate(drizzle(pool, { schema }), { migrationsFolder: './drizzle' })
    privateKey = await importPKCS8(process.env['JWT_PRIVATE_KEY'] ?? '', 'RS256')
    httpServer = app.getHttpServer()
}, 180_000)

afterAll(async () => {
    await app?.close()
    await container?.stop()
})

beforeEach(async () => {
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE')
    mailer.sent.length = 0
})

/** Poll until `predicate` is true (for the fire-and-forget verification email). */
async function waitFor(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
    const start = Date.now()
    while (!predicate()) {
        if (Date.now() - start > timeoutMs) throw new Error('Timed out waiting for condition')
        await new Promise((resolve) => setTimeout(resolve, 20))
    }
}

afterEach(() => {
    nock.cleanAll()
    // Deactivate again so DB/supertest/Docker traffic isn't intercepted.
    if (nock.isActive()) nock.restore()
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

/** A valid username derived from the email local-part (a–z0–9_, min 3 chars). */
function usernameFor(email: string): string {
    return email
        .split('@')[0]!
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .padEnd(3, '0')
        .slice(0, 30)
}

async function registerUser(email: string): Promise<string[]> {
    const res = await gql(
        `mutation { register(input: { email: "${email}", username: "${usernameFor(email)}", password: "supersecret" }) { id email role isAdmin } }`,
    )
    expect(res.body.errors).toBeUndefined()
    return setCookies(res)
}

// ── tests ─────────────────────────────────────────────────────────────
describe('Auth guard via GraphQL `me`', () => {
    it('rejects a request with no auth cookie', async () => {
        const res = await gql(`query { me { id } }`)
        expect(res.body.data?.me ?? null).toBeNull()
        expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED')
    })

    it('rejects a malformed token', async () => {
        const res = await gql(`query { me { id } }`, `${COOKIE.access}=not-a-jwt`)
        expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED')
    })

    it('rejects an expired token', async () => {
        const nowSec = Math.floor(Date.now() / 1000)
        const expired = await new SignJWT({
            email: 'x@example.com',
            role: 'athlete',
            isAdmin: false,
        })
            .setProtectedHeader({ alg: 'RS256' })
            .setSubject('00000000-0000-4000-8000-000000000000')
            .setIssuer('powerlog')
            .setAudience('powerlog-web')
            .setIssuedAt(nowSec - 3600)
            .setExpirationTime(nowSec - 1800)
            .sign(privateKey)

        const res = await gql(`query { me { id } }`, `${COOKIE.access}=${expired}`)
        expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED')
    })

    it('accepts a valid session cookie and returns the user', async () => {
        const cookies = await registerUser('me@example.com')
        const access = cookiePair(cookies, COOKIE.access)

        const res = await gql(`query { me { id email role isAdmin } }`, access)
        expect(res.body.errors).toBeUndefined()
        expect(res.body.data.me).toMatchObject({
            email: 'me@example.com',
            role: 'athlete',
            isAdmin: false,
        })
    })
})

describe('Session lifecycle via GraphQL', () => {
    it('register sets both auth cookies and returns the new athlete', async () => {
        const cookies = await registerUser('new@example.com')
        expect(cookiePair(cookies, COOKIE.access)).toBeDefined()
        expect(cookiePair(cookies, COOKIE.refresh)).toBeDefined()
    })

    it('refresh rotates the session; reusing the old refresh token revokes the family', async () => {
        const cookies1 = await registerUser('rotate@example.com')
        const rt1 = cookiePair(cookies1, COOKIE.refresh)!

        const refreshed = await gql(`mutation { refresh { id email } }`, rt1)
        expect(refreshed.body.errors).toBeUndefined()
        const rt2 = cookiePair(setCookies(refreshed), COOKIE.refresh)!

        // Reusing the rotated-away token is detected as theft.
        const reuse = await gql(`mutation { refresh { id } }`, rt1)
        expect(reuse.body.errors[0].extensions.code).toBe('INVALID_REFRESH_TOKEN')

        // ...and that revokes the whole family, so the current token is dead too.
        const afterReuse = await gql(`mutation { refresh { id } }`, rt2)
        expect(afterReuse.body.errors[0].extensions.code).toBe('INVALID_REFRESH_TOKEN')
    })

    it('refresh without a cookie is unauthenticated', async () => {
        const res = await gql(`mutation { refresh { id } }`)
        expect(res.body.errors[0].extensions.code).toBe('UNAUTHENTICATED')
    })

    it('logout revokes the session so the refresh token can no longer be used', async () => {
        const cookies = await registerUser('logout@example.com')
        const rt = cookiePair(cookies, COOKIE.refresh)!

        const out = await gql(`mutation { logout }`, rt)
        expect(out.body.data.logout).toBe(true)

        const res = await gql(`mutation { refresh { id } }`, rt)
        expect(res.body.errors[0].extensions.code).toBe('INVALID_REFRESH_TOKEN')
    })
})

describe('Google OAuth (REST callback)', () => {
    function nockGoogle(sub: string, email: string): void {
        if (!nock.isActive()) nock.activate()
        nock('https://www.googleapis.com').post('/oauth2/v4/token').reply(200, {
            access_token: 'ya29.test',
            token_type: 'Bearer',
            expires_in: 3600,
        })
        nock('https://www.googleapis.com')
            .get('/oauth2/v3/userinfo')
            .query(true)
            .reply(200, { sub, email, email_verified: true })
    }

    it("redirects to Google's consent screen with the right params", async () => {
        const res = await request(httpServer).get('/auth/google')
        expect(res.status).toBe(302)
        const location = res.headers['location']
        expect(location).toContain('accounts.google.com')
        expect(location).toContain('client_id=test-google-client-id')
        expect(location).toContain('response_type=code')
        expect(location).toContain('scope=email%20profile')
    })

    it('exchanges the code, sets cookies and redirects to the web origin', async () => {
        nockGoogle('google-e2e-1', 'googleuser@example.com')

        const res = await request(httpServer).get('/auth/google/callback?code=valid-code')

        expect(res.status).toBe(302)
        expect(res.headers['location']).toBe(WEB_ORIGIN)
        const cookies = setCookies(res)
        expect(cookiePair(cookies, COOKIE.access)).toBeDefined()
        expect(cookiePair(cookies, COOKIE.refresh)).toBeDefined()
    })

    it('does not create a duplicate user on a second callback for the same identity', async () => {
        nockGoogle('google-e2e-1', 'googleuser@example.com')
        await request(httpServer).get('/auth/google/callback?code=code-1')
        nockGoogle('google-e2e-1', 'googleuser@example.com')
        await request(httpServer).get('/auth/google/callback?code=code-2')

        const { rows } = await pool.query<{ n: number }>('SELECT count(*)::int AS n FROM users')
        expect(rows[0]?.n).toBe(1)
    })
})

describe('Email verification (GraphQL + email)', () => {
    it('registers unverified, emails a link, and verifies via the token', async () => {
        const cookies = await registerUser('verify-e2e@example.com')
        const access = cookiePair(cookies, COOKIE.access)

        const before = await gql(`query { me { emailVerified } }`, access)
        expect(before.body.data.me.emailVerified).toBe(false)

        // The verification email is sent fire-and-forget from an event handler.
        await waitFor(() => mailer.sent.length > 0)
        const link = (mailer.last()?.text ?? '').match(/https?:\/\/\S+/)?.[0] ?? ''
        const token = new URL(link).searchParams.get('token') ?? ''

        const verify = await gql(`mutation { verifyEmail(token: ${JSON.stringify(token)}) }`)
        expect(verify.body.errors).toBeUndefined()
        expect(verify.body.data.verifyEmail).toBe(true)

        const after = await gql(`query { me { emailVerified } }`, access)
        expect(after.body.data.me.emailVerified).toBe(true)
    })
})

describe('Password reset + change (GraphQL + email)', () => {
    it('forgot → reset → login with the new password; old sessions are revoked', async () => {
        const cookies = await registerUser('reset-e2e@example.com')
        const oldRefresh = cookiePair(cookies, COOKIE.refresh)!

        const forgot = await gql(`mutation { forgotPassword(email: "reset-e2e@example.com") }`)
        expect(forgot.body.data.forgotPassword).toBe(true)

        await waitFor(() => mailer.sent.some((m) => m.subject.includes('Reset')))
        const resetMail = [...mailer.sent].reverse().find((m) => m.subject.includes('Reset'))!
        const link = (resetMail.text ?? '').match(/https?:\/\/\S+/)?.[0] ?? ''
        const token = new URL(link).searchParams.get('token') ?? ''

        const reset = await gql(
            `mutation { resetPassword(input: { token: ${JSON.stringify(token)}, newPassword: "newpassword123" }) }`,
        )
        expect(reset.body.errors).toBeUndefined()
        expect(reset.body.data.resetPassword).toBe(true)

        // Login with the new password works.
        const login = await gql(
            `mutation { login(input: { email: "reset-e2e@example.com", password: "newpassword123" }) { email } }`,
        )
        expect(login.body.errors).toBeUndefined()
        expect(login.body.data.login.email).toBe('reset-e2e@example.com')

        // The pre-reset refresh token was revoked.
        const reuse = await gql(`mutation { refresh { id } }`, oldRefresh)
        expect(reuse.body.errors[0].extensions.code).toBe('INVALID_REFRESH_TOKEN')
    })

    it('changePassword lets the user log in with the new password', async () => {
        const cookies = await registerUser('change-e2e@example.com')
        const access = cookiePair(cookies, COOKIE.access)

        const changed = await gql(
            `mutation { changePassword(input: { currentPassword: "supersecret", newPassword: "changedpass123" }) }`,
            access,
        )
        expect(changed.body.errors).toBeUndefined()
        expect(changed.body.data.changePassword).toBe(true)

        const login = await gql(
            `mutation { login(input: { email: "change-e2e@example.com", password: "changedpass123" }) { email } }`,
        )
        expect(login.body.data.login.email).toBe('change-e2e@example.com')
    })
})

describe('Sessions / devices (GraphQL)', () => {
    it('lists active sessions, flags the current, and revokes the others', async () => {
        const a = await registerUser('sessions-e2e@example.com')
        const both = `${cookiePair(a, COOKIE.access)}; ${cookiePair(a, COOKIE.refresh)}`

        // A second login creates a second session (a new family).
        const second = await gql(
            `mutation { login(input: { email: "sessions-e2e@example.com", password: "supersecret" }) { id } }`,
        )
        const bRefresh = cookiePair(setCookies(second), COOKIE.refresh)!

        const list = await gql(`query { mySessions { id current } }`, both)
        expect(list.body.data.mySessions).toHaveLength(2)
        expect(list.body.data.mySessions.filter((s: { current: boolean }) => s.current)).toHaveLength(1)

        const revoke = await gql(`mutation { revokeOtherSessions }`, both)
        expect(revoke.body.data.revokeOtherSessions).toBe(true)

        const after = await gql(`query { mySessions { id } }`, both)
        expect(after.body.data.mySessions).toHaveLength(1)

        // The other session's refresh token no longer works.
        const reuse = await gql(`mutation { refresh { id } }`, bRefresh)
        expect(reuse.body.errors[0].extensions.code).toBe('INVALID_REFRESH_TOKEN')
    })

    it('revokes a single session by id', async () => {
        const a = await registerUser('revoke-one-e2e@example.com')
        const both = `${cookiePair(a, COOKIE.access)}; ${cookiePair(a, COOKIE.refresh)}`
        await gql(`mutation { login(input: { email: "revoke-one-e2e@example.com", password: "supersecret" }) { id } }`)

        const list = await gql(`query { mySessions { id current } }`, both)
        const other = list.body.data.mySessions.find((s: { current: boolean }) => !s.current)

        const revoke = await gql(`mutation { revokeSession(id: ${JSON.stringify(other.id)}) }`, both)
        expect(revoke.body.data.revokeSession).toBe(true)

        const after = await gql(`query { mySessions { id } }`, both)
        expect(after.body.data.mySessions).toHaveLength(1)
    })
})

describe('Avatar (REST upload + serve)', () => {
    it('uploads an image, stores a WebP, and serves it back', async () => {
        const cookies = await registerUser('avatar-e2e@example.com')
        const access = cookiePair(cookies, COOKIE.access) ?? ''
        const png = await sharp({
            create: { width: 64, height: 32, channels: 3, background: { r: 10, g: 120, b: 200 } },
        })
            .png()
            .toBuffer()

        const upload = await request(httpServer)
            .post('/profile/avatar')
            .set('Cookie', access)
            .attach('file', png, { filename: 'me.png', contentType: 'image/png' })
        expect(upload.status).toBe(201)
        // The URL carries a cache-busting `?v=` suffix (the key is reused per user).
        expect(upload.body.avatarUrl).toMatch(/\/avatars\/.+\.webp(\?.+)?$/)

        const path = new URL(upload.body.avatarUrl).pathname
        const served = await request(httpServer).get(path).responseType('blob')
        expect(served.status).toBe(200)
        expect(served.headers['content-type']).toBe('image/webp')

        const meta = await sharp(served.body as Buffer).metadata()
        expect(meta.format).toBe('webp')
        expect(meta.width).toBe(256)
    })
})
