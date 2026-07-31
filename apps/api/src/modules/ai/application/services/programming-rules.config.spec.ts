import { describe, expect, it } from 'vitest'

import { goalToObjective } from './programming-rules.config'

describe('goalToObjective', () => {
    it('reads strength intent from the free-text goal, in either language', () => {
        expect(goalToObjective('strength')).toBe('strength')
        expect(goalToObjective('peak for a powerlifting meet')).toBe('strength')
        expect(goalToObjective('ganar fuerza')).toBe('strength')
    })

    it('reads hypertrophy intent from the free-text goal', () => {
        expect(goalToObjective('hypertrophy')).toBe('hypertrophy')
        expect(goalToObjective('build mass')).toBe('hypertrophy')
        expect(goalToObjective('hipertrofia y volumen')).toBe('hypertrophy')
    })

    it('falls back to general for an empty or unrecognised goal', () => {
        expect(goalToObjective(null)).toBe('general')
        expect(goalToObjective('feel good and stay healthy')).toBe('general')
    })
})
