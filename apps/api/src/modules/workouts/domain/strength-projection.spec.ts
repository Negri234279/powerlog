import { describe, expect, it } from 'vitest'

import { linearRegression, projectAt } from './strength-projection'

describe('linearRegression', () => {
    it('returns null with fewer than two points', () => {
        expect(linearRegression([])).toBeNull()
        expect(linearRegression([{ x: 0, y: 100 }])).toBeNull()
    })

    it('returns null when x has no variance (all points same day)', () => {
        expect(
            linearRegression([
                { x: 2, y: 100 },
                { x: 2, y: 110 },
            ]),
        ).toBeNull()
    })

    it('fits a perfect upward line (R² = 1)', () => {
        const line = linearRegression([
            { x: 0, y: 100 },
            { x: 1, y: 105 },
            { x: 2, y: 110 },
        ])
        expect(line).not.toBeNull()
        expect(line!.slope).toBeCloseTo(5)
        expect(line!.intercept).toBeCloseTo(100)
        expect(line!.r2).toBe(1)
    })

    it('detects a downward trend (regression/plateau case)', () => {
        const line = linearRegression([
            { x: 0, y: 120 },
            { x: 1, y: 118 },
            { x: 2, y: 116 },
        ])
        expect(line!.slope).toBeCloseTo(-2)
    })

    it('reports a weak fit for noisy data', () => {
        const line = linearRegression([
            { x: 0, y: 100 },
            { x: 1, y: 90 },
            { x: 2, y: 115 },
            { x: 3, y: 95 },
        ])
        expect(line!.r2).toBeLessThan(0.5)
    })
})

describe('projectAt', () => {
    it('evaluates the line at a future x and rounds to 2 decimals', () => {
        const line = { slope: 5, intercept: 100, r2: 1 }
        expect(projectAt(line, 0)).toBe(100)
        expect(projectAt(line, 4)).toBe(120)
    })
})
