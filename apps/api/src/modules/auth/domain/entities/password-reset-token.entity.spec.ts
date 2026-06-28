import { describe, expect, it } from 'vitest'

import { PasswordResetTokenMother } from '../../../../../tests/mothers/auth/password-reset-token.mother'

const NOW = new Date('2026-06-01T00:00:00.000Z')

describe('PasswordResetTokenEntity', () => {
    it('is active when neither expired nor consumed', () => {
        expect(PasswordResetTokenMother.valid().build().isActive(NOW)).toBe(true)
    })

    it('is not active once expired', () => {
        expect(PasswordResetTokenMother.expired().build().isActive(NOW)).toBe(false)
    })

    it('is not active once consumed', () => {
        const token = PasswordResetTokenMother.consumed().build()
        expect(token.isConsumed()).toBe(true)
        expect(token.isActive(NOW)).toBe(false)
    })
})
