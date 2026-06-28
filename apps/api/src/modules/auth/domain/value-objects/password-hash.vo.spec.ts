import { describe, expect, it } from 'vitest'

import { InvalidPasswordHashError } from '../errors/auth.errors'
import { PasswordHashVO } from './password-hash.vo'

describe('PasswordHashVO', () => {
    it('accepts an argon2 PHC hash', () => {
        const hash = '$argon2id$v=19$m=65536,t=3,p=4$abc$def'
        expect(PasswordHashVO.fromHash(hash).value).toBe(hash)
    })

    it('rejects a non-argon2 value (never plaintext)', () => {
        expect(() => PasswordHashVO.fromHash('plaintext')).toThrow(InvalidPasswordHashError)
    })

    it('compares by value', () => {
        const hash = '$argon2id$v=19$m=65536,t=3,p=4$abc$def'
        expect(PasswordHashVO.fromHash(hash).equals(PasswordHashVO.fromHash(hash))).toBe(true)
    })
})
