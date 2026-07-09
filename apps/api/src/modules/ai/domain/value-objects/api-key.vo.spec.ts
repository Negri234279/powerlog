import { describe, expect, it } from 'vitest'

import { InvalidApiKeyFormatError } from '../errors/ai-settings.errors'
import { ApiKeyVO } from './api-key.vo'

const VALID = 'sk-test-0123456789abcdef'

describe('ApiKeyVO', () => {
    it('trims surrounding whitespace from a pasted key', () => {
        expect(ApiKeyVO.create(`  ${VALID}\n`).value).toBe(VALID)
    })

    it('exposes only the last four characters as the masked hint', () => {
        expect(ApiKeyVO.create(VALID).last4).toBe('cdef')
    })

    it('serialises to a placeholder so it cannot leak through a logger', () => {
        expect(JSON.stringify({ key: ApiKeyVO.create(VALID) })).toBe('{"key":"[redacted]"}')
    })

    it('rejects a key that is too short to be one', () => {
        expect(() => ApiKeyVO.create('sk-short')).toThrow(InvalidApiKeyFormatError)
    })

    it('rejects a key containing whitespace', () => {
        expect(() => ApiKeyVO.create('sk-test 0123456789abcdef')).toThrow(InvalidApiKeyFormatError)
    })

    it('never echoes the rejected key in the error message', () => {
        const secret = 'sk-secret 0123456789abcdef'

        expect(() => ApiKeyVO.create(secret)).toThrow(
            expect.objectContaining({ message: expect.not.stringContaining('secret') }),
        )
    })
})
