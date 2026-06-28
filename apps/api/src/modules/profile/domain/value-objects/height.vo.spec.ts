import { describe, expect, it } from 'vitest'

import { InvalidHeightError } from '../errors/profile.errors'
import { HeightVO } from './height.vo'

describe('HeightVO', () => {
    it('accepts a whole number within range', () => {
        expect(HeightVO.create(180).value).toBe(180)
    })

    it('rejects non-integers', () => {
        expect(() => HeightVO.create(180.5)).toThrow(InvalidHeightError)
    })

    it('rejects values out of range', () => {
        expect(() => HeightVO.create(40)).toThrow(InvalidHeightError)
        expect(() => HeightVO.create(400)).toThrow(InvalidHeightError)
    })
})
