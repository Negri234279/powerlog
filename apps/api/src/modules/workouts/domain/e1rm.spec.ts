import { describe, expect, it } from 'vitest'

import { epleyOneRepMax } from './e1rm'

describe('epleyOneRepMax', () => {
    it('applies w·(1 + reps/30) rounded to 2 decimals', () => {
        expect(epleyOneRepMax(100, 5)).toBe(116.67)
        expect(epleyOneRepMax(90, 8)).toBe(114)
        expect(epleyOneRepMax(100, 1)).toBe(103.33)
    })
})
