import { describe, expect, it } from 'vitest'

import { EmailVerificationTokenMother } from '../../../../../tests/mothers/auth/email-verification-token.mother'

const NOW = new Date('2026-06-01T00:00:00.000Z')

describe('EmailVerificationTokenEntity', () => {
    it('is active when neither expired nor consumed', () => {
        const token = EmailVerificationTokenMother.valid().build()
        expect(token.isActive(NOW)).toBe(true)
    })

    it('treats expiry as inclusive', () => {
        const token = EmailVerificationTokenMother.valid().expiringAt(NOW).build()
        expect(token.isExpired(NOW)).toBe(true)
        expect(token.isExpired(new Date(NOW.getTime() - 1))).toBe(false)
    })

    it('is not active once expired', () => {
        const token = EmailVerificationTokenMother.expired().build()
        expect(token.isActive(NOW)).toBe(false)
    })

    it('is not active once consumed', () => {
        const token = EmailVerificationTokenMother.consumed().build()
        expect(token.isConsumed()).toBe(true)
        expect(token.isActive(NOW)).toBe(false)
    })
})
