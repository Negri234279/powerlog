import { describe, expect, it } from 'vitest'

import { RefreshTokenMother } from '../../../../../tests/mothers/auth/refresh-token.mother'

const NOW = new Date('2026-06-01T00:00:00.000Z')

describe('RefreshTokenEntity', () => {
    it('is active when neither expired nor revoked', () => {
        const token = RefreshTokenMother.valid().build()
        expect(token.isExpired(NOW)).toBe(false)
        expect(token.isRevoked()).toBe(false)
        expect(token.isActive(NOW)).toBe(true)
    })

    it('treats expiry as inclusive (expiresAt === now is expired)', () => {
        const token = RefreshTokenMother.create().expiringAt(NOW).build()
        expect(token.isExpired(NOW)).toBe(true)
        expect(token.isExpired(new Date(NOW.getTime() - 1))).toBe(false)
    })

    it('is not active once expired', () => {
        const token = RefreshTokenMother.expired().build()
        expect(token.isExpired(NOW)).toBe(true)
        expect(token.isActive(NOW)).toBe(false)
    })

    it('is not active once revoked, even if unexpired', () => {
        const token = RefreshTokenMother.revoked().build()
        expect(token.isRevoked()).toBe(true)
        expect(token.isExpired(NOW)).toBe(false)
        expect(token.isActive(NOW)).toBe(false)
    })

    it('a rotated token is revoked and points at its replacement', () => {
        const token = RefreshTokenMother.alreadyRotated('next-token-id').build()
        expect(token.isRevoked()).toBe(true)
        expect(token.replacedBy).toBe('next-token-id')
        expect(token.isActive(NOW)).toBe(false)
    })

    it('preserves the family it was created with', () => {
        const token = RefreshTokenMother.fromFamily('fam-123').build()
        expect(token.family).toBe('fam-123')
    })
})
