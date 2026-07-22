import { describe, expect, it } from 'vitest'

import { InvalidWeightError } from '../errors/workouts.errors'
import { WeightRangeVO } from './weight-range.vo'

describe('WeightRangeVO', () => {
    it('parses a kg range', () => {
        const range = WeightRangeVO.parse('50-55')

        expect(range.min.value).toBe(50)
        expect(range.max.value).toBe(55)
    })

    it('converts both bounds when the input is in pounds', () => {
        const range = WeightRangeVO.parse('100-110', 'lb')

        expect(range.min.value).toBe(45.36)
        expect(range.max.value).toBe(49.9)
    })

    it('rejects a bound above the scalar maximum', () => {
        expect(() => WeightRangeVO.parse('50-1001')).toThrow(InvalidWeightError)
    })
})
