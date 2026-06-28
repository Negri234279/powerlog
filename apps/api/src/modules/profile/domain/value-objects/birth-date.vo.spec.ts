import { describe, expect, it } from 'vitest'

import { InvalidBirthDateError } from '../errors/profile.errors'
import { BirthDateVO } from './birth-date.vo'

describe('BirthDateVO', () => {
    it('accepts a valid calendar date', () => {
        expect(BirthDateVO.create('1995-07-15').value).toBe('1995-07-15')
    })

    it('exposes the date as midnight UTC', () => {
        expect(BirthDateVO.create('1995-07-15').toDate().toISOString()).toBe('1995-07-15T00:00:00.000Z')
    })

    it('rejects a malformed string', () => {
        expect(() => BirthDateVO.create('15/07/1995')).toThrow(InvalidBirthDateError)
    })

    it('rejects an impossible date', () => {
        expect(() => BirthDateVO.create('2026-02-31')).toThrow(InvalidBirthDateError)
    })

    it('rejects an out-of-range year', () => {
        expect(() => BirthDateVO.create('1800-01-01')).toThrow(InvalidBirthDateError)
    })
})
