import { describe, expect, it } from 'vitest'

import { InvalidRpeError } from '../errors/workouts.errors'
import { RpeRangeVO } from './rpe-range.vo'

describe('RpeRangeVO', () => {
    it('parses a range and a single value', () => {
        expect(RpeRangeVO.parse('7-8').max.value).toBe(8)
        expect(RpeRangeVO.parse('8').isSingle).toBe(true)
    })

    it('keeps the half-point rule on both bounds', () => {
        expect(RpeRangeVO.parse('7.5-8').min.value).toBe(7.5)
        expect(() => RpeRangeVO.parse('7.2-8')).toThrow(InvalidRpeError)
        expect(() => RpeRangeVO.parse('7-10.5')).toThrow(InvalidRpeError)
    })
})
