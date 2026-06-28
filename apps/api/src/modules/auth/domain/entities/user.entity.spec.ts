import { describe, expect, it } from 'vitest'

import { UserMother } from '../../../../../tests/mothers/auth/user.mother'
import { UserRegisteredEvent } from '../events/user-registered.event'
import { PasswordHashVO } from '../value-objects/password-hash.vo'

describe('UserAggregate', () => {
    describe('register()', () => {
        it('emits a UserRegisteredEvent for the new user', () => {
            const user = UserMother.create().build()
            const events = user.getUncommittedEvents()

            expect(events).toHaveLength(1)
            expect(events[0]).toBeInstanceOf(UserRegisteredEvent)
            expect((events[0] as UserRegisteredEvent).userId).toBe(user.id)
        })

        it('defaults role to athlete and isAdmin to false', () => {
            const user = UserMother.create().build()
            expect(user.role.value).toBe('athlete')
            expect(user.isAdmin).toBe(false)
        })

        it('honours an explicit role and admin flag', () => {
            const user = UserMother.coach().asAdmin().build()
            expect(user.role.value).toBe('coach')
            expect(user.isAdmin).toBe(true)
        })
    })

    describe('rehydrate()', () => {
        it('does not emit events', () => {
            const user = UserMother.create().buildExisting()
            expect(user.getUncommittedEvents()).toHaveLength(0)
        })
    })

    describe('hasPassword()', () => {
        it('reflects the presence of a password hash', () => {
            expect(UserMother.create().withPassword().build().hasPassword()).toBe(true)
            expect(UserMother.create().withoutPassword().build().hasPassword()).toBe(false)
        })
    })

    describe('verifyEmail()', () => {
        it('is unverified by default and verifies once (idempotent)', () => {
            const user = UserMother.create().build()
            expect(user.isEmailVerified()).toBe(false)

            const first = new Date('2026-02-01T00:00:00.000Z')
            user.verifyEmail(first)
            expect(user.isEmailVerified()).toBe(true)
            expect(user.emailVerifiedAt).toEqual(first)

            // A second call keeps the original verification time.
            user.verifyEmail(new Date('2026-03-01T00:00:00.000Z'))
            expect(user.emailVerifiedAt).toEqual(first)
        })
    })

    describe('setPassword()', () => {
        it('replaces the password hash', () => {
            const user = UserMother.create().withoutPassword().build()
            expect(user.hasPassword()).toBe(false)

            user.setPassword(PasswordHashVO.fromHash('$argon2id$v=19$fake$new'), new Date())
            expect(user.hasPassword()).toBe(true)
            expect(user.passwordHash?.value).toBe('$argon2id$v=19$fake$new')
        })
    })

    describe('linkIdentity()', () => {
        it('is idempotent on provider + providerId', () => {
            const user = UserMother.create().withoutPassword().build()
            const now = new Date()

            user.linkIdentity({ provider: 'google', providerId: 'g-1' }, now)
            user.linkIdentity({ provider: 'google', providerId: 'g-1' }, now)

            expect(user.identities).toHaveLength(1)
            expect(user.hasIdentity('google', 'g-1')).toBe(true)
        })

        it('reports a missing identity as absent', () => {
            const user = UserMother.create().build()
            expect(user.hasIdentity('google', 'nope')).toBe(false)
        })
    })

    describe('account lifecycle', () => {
        const NOW = new Date('2026-04-01T00:00:00.000Z')

        it('starts active and can authenticate', () => {
            const user = UserMother.create().build()
            expect(user.status).toBe('active')
            expect(user.canAuthenticate()).toBe(true)
        })

        it('disable() suspends (no auth) and enable() restores, both idempotent', () => {
            const user = UserMother.create().build()

            user.disable(NOW)
            user.disable(NOW)
            expect(user.status).toBe('disabled')
            expect(user.canAuthenticate()).toBe(false)

            user.enable(NOW)
            expect(user.status).toBe('active')
            expect(user.canAuthenticate()).toBe(true)
        })

        it('softDelete() scrubs PII, frees the email, and blocks auth', () => {
            const user = UserMother.create()
                .withId('11111111-1111-4111-8111-111111111111')
                .withEmail('rafa@example.com')
                .withPassword()
                .build()

            user.softDelete(NOW)

            expect(user.status).toBe('deleted')
            expect(user.canAuthenticate()).toBe(false)
            expect(user.hasPassword()).toBe(false)
            expect(user.identities).toHaveLength(0)
            // The original email is gone; the placeholder is derived from the (unique) id.
            expect(user.email.value).not.toContain('rafa@example.com')
            expect(user.email.value).toContain('@deleted.invalid')
        })

        it('softDelete() is idempotent', () => {
            const user = UserMother.create().withId('22222222-2222-4222-8222-222222222222').build()
            user.softDelete(NOW)
            const scrubbedEmail = user.email.value
            user.softDelete(new Date('2027-01-01T00:00:00.000Z'))
            expect(user.email.value).toBe(scrubbedEmail)
        })

        it('refuses to enable or disable a deleted account', () => {
            const user = UserMother.create().deleted().buildExisting()
            expect(() => user.enable(NOW)).toThrow()
            expect(() => user.disable(NOW)).toThrow()
        })
    })
})
