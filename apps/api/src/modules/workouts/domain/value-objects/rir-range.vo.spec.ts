import { describe, expect, it } from 'vitest'

import { InvalidRirError } from '../errors/workouts.errors'
import { RirRangeVO } from './rir-range.vo'

describe('RirRangeVO', () => {
    it('parses a range and a single value', () => {
        const range = RirRangeVO.parse('1-2')

        expect(range.min.value).toBe(1)
        expect(range.max.value).toBe(2)
        expect(RirRangeVO.parse('2').isSingle).toBe(true)
    })

    it('keeps the whole-number rule on both bounds', () => {
        expect(() => RirRangeVO.parse('1-2.5')).toThrow(InvalidRirError)
        expect(() => RirRangeVO.parse('1-51')).toThrow(InvalidRirError)
    })
})
