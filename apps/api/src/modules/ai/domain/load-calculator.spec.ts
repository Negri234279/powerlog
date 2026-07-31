import { describe, expect, it } from 'vitest'

import { prescribeLoad } from './load-calculator'

const base = { e1rmKg: 100, reps: 5, rpe: null, rir: null, equipment: 'barbell' as const }

describe('prescribeLoad', () => {
    it('returns null without an e1RM — never guess a weight with no history', () => {
        expect(prescribeLoad({ ...base, e1rmKg: null, rpe: 8 })).toBeNull()
    })

    it('returns null for a bodyweight movement — there is no external load', () => {
        expect(prescribeLoad({ ...base, equipment: 'bodyweight', rpe: 8 })).toBeNull()
    })

    it('returns null for an unknown equipment value', () => {
        expect(prescribeLoad({ ...base, equipment: 'kettlebell', rpe: 8 })).toBeNull()
    })

    it('returns null when the target carries no intensity', () => {
        expect(prescribeLoad({ ...base, rpe: null, rir: null })).toBeNull()
    })

    it('prescribes a true single at 100% and never above the e1RM', () => {
        expect(prescribeLoad({ ...base, reps: 1, rpe: 10, e1rmKg: 200 })).toBe(200)
    })

    it('reads RPE and the equivalent RIR the same way', () => {
        // 5 reps @ RPE 8 → 7 reps to failure → 81.1% of 100 → 80 (rounded to 2.5).
        expect(prescribeLoad({ ...base, rpe: 8 })).toBe(80)
        expect(prescribeLoad({ ...base, rir: 2 })).toBe(80)
    })

    it('rounds to the equipment increment (dumbbell steps by 1.25 kg)', () => {
        // 10 reps @ RPE 10 → 73.9% of 50 = 36.95 → nearest 1.25 → 37.5.
        expect(prescribeLoad({ ...base, e1rmKg: 50, reps: 10, rpe: 10, equipment: 'dumbbell' })).toBe(37.5)
    })

    it('interpolates a fractional RPE', () => {
        // 5 reps @ RPE 8.5 → 6.5 RTF → ~82.4% of 100 → nearest 2.5 → 82.5.
        expect(prescribeLoad({ ...base, rpe: 8.5 })).toBe(82.5)
    })

    it('falls back to the Epley curve past the chart', () => {
        // 15 reps @ RPE 10 → 15 RTF → inverse Epley ≈ 66.7% of 100 → 67.5.
        expect(prescribeLoad({ ...base, reps: 15, rpe: 10 })).toBe(67.5)
    })
})
