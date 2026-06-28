import { describe, expect, it } from 'vitest'

import { InvalidEmailError } from '../errors/auth.errors'
import { EmailVO } from './email.vo'

describe('EmailVO', () => {
    it('normalizes by trimming and lowercasing', () => {
        expect(EmailVO.create('  Lifter@Example.COM ').value).toBe('lifter@example.com')
    })

    it('rejects a malformed address', () => {
        expect(() => EmailVO.create('not-an-email')).toThrow(InvalidEmailError)
    })

    it('rejects an address longer than 254 chars', () => {
        const tooLong = `${'a'.repeat(250)}@b.com`
        expect(() => EmailVO.create(tooLong)).toThrow(InvalidEmailError)
    })

    it('treats two normalized-equal addresses as equal', () => {
        expect(EmailVO.create('A@B.com').equals(EmailVO.create('a@b.com'))).toBe(true)
    })
})
