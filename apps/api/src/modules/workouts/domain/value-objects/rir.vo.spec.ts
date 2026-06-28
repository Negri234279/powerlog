import { describe, expect, it } from 'vitest'

import { InvalidRirError } from '../errors/workouts.errors'
import { RirVO } from './rir.vo'

describe('RirVO', () => {
    it('accepts a whole number in range', () => {
        expect(RirVO.create(2).value).toBe(2)
        expect(RirVO.create(0).value).toBe(0)
    })

    it('rejects negative, non-integer and out-of-range values', () => {
        expect(() => RirVO.create(-1)).toThrow(InvalidRirError)
        expect(() => RirVO.create(2.5)).toThrow(InvalidRirError)
        expect(() => RirVO.create(51)).toThrow(InvalidRirError)
    })
})
