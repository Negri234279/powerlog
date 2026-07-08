import { describe, expect, it } from 'vitest'

import { InvalidMesocycleNameError } from '../errors/workouts.errors'
import { MesocycleNameVO } from './mesocycle-name.vo'

describe('MesocycleNameVO', () => {
    it('trims and accepts a 1–100 character name', () => {
        expect(MesocycleNameVO.create('  Hypertrophy Block  ').value).toBe('Hypertrophy Block')
    })

    it('rejects an empty name (after trimming)', () => {
        expect(() => MesocycleNameVO.create('   ')).toThrow(InvalidMesocycleNameError)
    })

    it('rejects a name longer than 100 characters', () => {
        expect(() => MesocycleNameVO.create('x'.repeat(101))).toThrow(InvalidMesocycleNameError)
    })
})
