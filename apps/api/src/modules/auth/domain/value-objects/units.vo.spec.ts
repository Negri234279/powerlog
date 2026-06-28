import { describe, expect, it } from 'vitest'

import { InvalidUnitsError } from '../errors/auth.errors'
import { UnitsVO } from './units.vo'

describe('UnitsVO', () => {
    it('accepts kg and lb', () => {
        expect(UnitsVO.create('kg').value).toBe('kg')
        expect(UnitsVO.create('lb').value).toBe('lb')
    })

    it('defaults to kg', () => {
        expect(UnitsVO.default().value).toBe('kg')
    })

    it('rejects an unknown unit', () => {
        expect(() => UnitsVO.create('stone')).toThrow(InvalidUnitsError)
    })

    it('compares by value', () => {
        expect(UnitsVO.create('kg').equals(UnitsVO.default())).toBe(true)
        expect(UnitsVO.create('kg').equals(UnitsVO.create('lb'))).toBe(false)
    })
})
