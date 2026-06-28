import { describe, expect, it } from 'vitest'

import { InvalidRepsError } from '../errors/workouts.errors'
import { RepsVO } from './reps.vo'

describe('RepsVO', () => {
    it('accepts a whole number in range', () => {
        expect(RepsVO.create(5).value).toBe(5)
    })

    it('rejects zero, non-integers and out-of-range values', () => {
        expect(() => RepsVO.create(0)).toThrow(InvalidRepsError)
        expect(() => RepsVO.create(5.5)).toThrow(InvalidRepsError)
        expect(() => RepsVO.create(1001)).toThrow(InvalidRepsError)
    })
})
