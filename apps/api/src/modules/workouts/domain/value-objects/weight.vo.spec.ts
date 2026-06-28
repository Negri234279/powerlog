import { describe, expect, it } from 'vitest'

import { InvalidWeightError } from '../errors/workouts.errors'
import { WeightVO } from './weight.vo'

describe('WeightVO', () => {
    it('accepts a non-negative weight in kg', () => {
        expect(WeightVO.create(102.5).value).toBe(102.5)
        expect(WeightVO.create(0).value).toBe(0)
    })

    it('rejects negative, non-finite or out-of-range weights', () => {
        expect(() => WeightVO.create(-1)).toThrow(InvalidWeightError)
        expect(() => WeightVO.create(1001)).toThrow(InvalidWeightError)
        expect(() => WeightVO.create(Number.NaN)).toThrow(InvalidWeightError)
    })

    it('converts pounds to kg (2 decimals) and passes kg through', () => {
        expect(WeightVO.fromUnit(225, 'lb').value).toBe(102.06)
        expect(WeightVO.fromUnit(100, 'kg').value).toBe(100)
    })

    it('compares by value', () => {
        expect(WeightVO.create(100).equals(WeightVO.create(100))).toBe(true)
        expect(WeightVO.create(100).equals(WeightVO.create(101))).toBe(false)
    })
})
