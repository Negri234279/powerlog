import { describe, expect, it } from 'vitest'

import { InvalidRpeError } from '../errors/workouts.errors'
import { RpeVO } from './rpe.vo'

describe('RpeVO', () => {
    it('accepts 0–10 in half-point steps', () => {
        expect(RpeVO.create(8).value).toBe(8)
        expect(RpeVO.create(8.5).value).toBe(8.5)
    })

    it('rejects out-of-range or non-half-step values', () => {
        expect(() => RpeVO.create(-1)).toThrow(InvalidRpeError)
        expect(() => RpeVO.create(11)).toThrow(InvalidRpeError)
        expect(() => RpeVO.create(8.25)).toThrow(InvalidRpeError)
    })
})
