import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { FakeAuthConfig, FakeAuthMetrics, FakePasswordHasher, FakeTokenSigner } from '../../../../tests/doubles/auth'
import { FakeProfiles, fakeEventPublisher, RecordingEventBus } from '../../../../tests/doubles/shared'
import { UserMother } from '../../../../tests/mothers/auth'
import * as schema from '../../../database/schema'
import { LoginWithGoogleCommand } from '../application/commands/login-with-google/login-with-google.command'
import { LoginWithGoogleHandler } from '../application/commands/login-with-google/login-with-google.handler'
import { RefreshSessionCommand } from '../application/commands/refresh-session/refresh-session.command'
import { RefreshSessionHandler } from '../application/commands/refresh-session/refresh-session.handler'
import { ResetPasswordCommand } from '../application/commands/reset-password/reset-password.command'
import { ResetPasswordHandler } from '../application/commands/reset-password/reset-password.handler'
import { VerifyEmailCommand } from '../application/commands/verify-email/verify-email.command'
import { VerifyEmailHandler } from '../application/commands/verify-email/verify-email.handler'
import { SessionIssuer } from '../application/services/session-issuer.service'
import { Sha256RefreshTokenGenerator } from '../infrastructure/crypto/sha256-refresh-token-generator'
import { Sha256TokenGenerator } from '../infrastructure/crypto/sha256-token-generator'
import { UuidGenerator } from '../infrastructure/id/uuid-generator'
import { DrizzleEmailVerificationTokenRepository } from '../infrastructure/persistence/repositories/drizzle-email-verification-token.repository'
import { DrizzlePasswordResetTokenRepository } from '../infrastructure/persistence/repositories/drizzle-password-reset-token.repository'
import { DrizzleRefreshTokenRepository } from '../infrastructure/persistence/repositories/drizzle-refresh-token.repository'
import { DrizzleUserRepository } from '../infrastructure/persistence/repositories/drizzle-user.repository'
import { SystemClock } from '../infrastructure/time/system-clock'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>

let users: DrizzleUserRepository
let refreshTokens: DrizzleRefreshTokenRepository
let generator: Sha256RefreshTokenGenerator
let profiles: FakeProfiles
let loginWithGoogle: LoginWithGoogleHandler
let refreshSession: RefreshSessionHandler
let verificationTokens: DrizzleEmailVerificationTokenRepository
let tokenGenerator: Sha256TokenGenerator
let verifyEmail: VerifyEmailHandler
let passwordResetTokens: DrizzlePasswordResetTokenRepository
let resetPassword: ResetPasswordHandler

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })

    // Real infra, only the external boundaries (token signing, TTL config) faked.
    users = new DrizzleUserRepository(db)
    refreshTokens = new DrizzleRefreshTokenRepository(db)
    generator = new Sha256RefreshTokenGenerator()
    const clock = new SystemClock()
    const ids = new UuidGenerator()
    // Profile boundary faked: provisioning populates the snapshot the issuer reads.
    profiles = new FakeProfiles()
    const sessions = new SessionIssuer(
        new FakeTokenSigner(),
        generator,
        refreshTokens,
        clock,
        new FakeAuthConfig(),
        ids,
        profiles,
    )
    const metrics = new FakeAuthMetrics()
    loginWithGoogle = new LoginWithGoogleHandler(
        users,
        ids,
        clock,
        sessions,
        profiles,
        fakeEventPublisher(),
        new RecordingEventBus().asEventBus(),
        metrics,
    )
    refreshSession = new RefreshSessionHandler(refreshTokens, users, generator, clock, sessions, metrics)

    verificationTokens = new DrizzleEmailVerificationTokenRepository(db)
    tokenGenerator = new Sha256TokenGenerator()
    verifyEmail = new VerifyEmailHandler(verificationTokens, users, tokenGenerator, clock)

    passwordResetTokens = new DrizzlePasswordResetTokenRepository(db)
    resetPassword = new ResetPasswordHandler(
        passwordResetTokens,
        users,
        refreshTokens,
        new FakePasswordHasher(),
        tokenGenerator,
        clock,
    )
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE users RESTART IDENTITY CASCADE`)
})

describe('Auth persistence (integration)', () => {
    it('persists and recovers a Google user with correct types, nulls and timestamps', async () => {
        const { userId } = await loginWithGoogle.execute(new LoginWithGoogleCommand('google-123', 'Lifter@Example.com'))

        const reloaded = await users.findById(userId)
        expect(reloaded).not.toBeNull()
        expect(reloaded?.email.value).toBe('lifter@example.com')
        expect(reloaded?.role.value).toBe('athlete')
        expect(reloaded?.isAdmin).toBe(false)
        expect(reloaded?.passwordHash).toBeNull()
        expect(reloaded?.units.value).toBe('kg')
        expect(reloaded?.hasIdentity('google', 'google-123')).toBe(true)
        expect(reloaded?.createdAt).toBeInstanceOf(Date)
    })

    it('auto-links a Google identity to an existing same-email account without duplicating it', async () => {
        const existing = UserMother.create().withEmail('known@example.com').buildExisting()
        await users.save(existing)
        // The existing account already has a profile (auto-link won't provision one).
        profiles.set(existing.id, { username: 'gymrat', avatarUrl: null })

        const { userId } = await loginWithGoogle.execute(new LoginWithGoogleCommand('google-456', 'known@example.com'))

        expect(userId).toBe(existing.id)
        const rows = await db.select().from(schema.users)
        expect(rows).toHaveLength(1)
        const reloaded = await users.findById(existing.id)
        expect(reloaded?.hasIdentity('google', 'google-456')).toBe(true)
        expect(reloaded?.hasPassword()).toBe(true)
    })

    it('stores only the hashed refresh token, never the raw value', async () => {
        const { refreshToken } = await loginWithGoogle.execute(
            new LoginWithGoogleCommand('google-123', 'lifter@example.com'),
        )

        const stored = await refreshTokens.findByHash(generator.hash(refreshToken))
        expect(stored).not.toBeNull()
        expect(stored?.tokenHash).not.toBe(refreshToken)
        expect(stored?.tokenHash).toBe(generator.hash(refreshToken))
    })

    it('rotates a token: the old one is revoked and linked to the active replacement', async () => {
        const first = await loginWithGoogle.execute(new LoginWithGoogleCommand('google-123', 'lifter@example.com'))

        const second = await refreshSession.execute(new RefreshSessionCommand(first.refreshToken))

        const old = await refreshTokens.findByHash(generator.hash(first.refreshToken))
        const fresh = await refreshTokens.findByHash(generator.hash(second.refreshToken))
        expect(old?.isRevoked()).toBe(true)
        expect(old?.replacedBy).toBe(fresh?.id)
        expect(fresh?.isRevoked()).toBe(false)
        expect(fresh?.family).toBe(old?.family)
    })

    it('preserves the family across multiple rotations', async () => {
        const first = await loginWithGoogle.execute(new LoginWithGoogleCommand('google-123', 'lifter@example.com'))
        const original = await refreshTokens.findByHash(generator.hash(first.refreshToken))

        let current = first.refreshToken
        for (let i = 0; i < 3; i++) {
            const next = await refreshSession.execute(new RefreshSessionCommand(current))
            const rotated = await refreshTokens.findByHash(generator.hash(next.refreshToken))
            expect(rotated?.family).toBe(original?.family)
            current = next.refreshToken
        }
    })
})

describe('Email verification (integration)', () => {
    it('verifies the user and marks the token consumed (hash stored, never raw)', async () => {
        const user = UserMother.create().withEmail('verify@example.com').buildExisting()
        await users.save(user)

        const { raw, hash } = tokenGenerator.generate()
        await verificationTokens.create({
            userId: user.id,
            tokenHash: hash,
            expiresAt: new Date(Date.now() + 60_000),
        })

        await verifyEmail.execute(new VerifyEmailCommand(raw))

        expect((await users.findById(user.id))?.isEmailVerified()).toBe(true)
        const stored = await verificationTokens.findByHash(hash)
        expect(stored?.isConsumed()).toBe(true)
        expect(stored?.tokenHash).not.toBe(raw)
    })
})

describe('Password reset (integration)', () => {
    it('resets the password, consumes the token, and revokes existing sessions', async () => {
        const user = UserMother.create().withEmail('reset@example.com').buildExisting()
        await users.save(user)
        const session = await refreshTokens.create({
            userId: user.id,
            family: randomUUID(),
            tokenHash: `hash-${user.id}`,
            expiresAt: new Date(Date.now() + 60_000),
        })

        const { raw, hash } = tokenGenerator.generate()
        await passwordResetTokens.create({ userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + 60_000) })

        await resetPassword.execute(new ResetPasswordCommand(raw, 'a-brand-new-password'))

        expect((await passwordResetTokens.findByHash(hash))?.isConsumed()).toBe(true)
        expect((await refreshTokens.findByHash(session.tokenHash))?.isRevoked()).toBe(true)
    })
})
