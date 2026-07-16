import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
    ConflictingIntensityError,
    ExerciseEntryNotFoundError,
    WorkoutSetNotFoundError,
} from '../errors/workouts.errors'
import { RepsVO } from '../value-objects/reps.vo'
import { RirVO } from '../value-objects/rir.vo'
import { RpeVO } from '../value-objects/rpe.vo'
import { WeightVO } from '../value-objects/weight.vo'
import { WorkoutSessionAggregate } from './workout-session.entity'

const NOW = new Date('2026-01-01T00:00:00.000Z')
const LATER = new Date('2026-01-02T00:00:00.000Z')

function newSession() {
    return WorkoutSessionAggregate.create({ id: randomUUID(), userId: 'u-1', performedAt: NOW, now: NOW })
}

describe('WorkoutSessionAggregate — marking sets done', () => {
    function sessionWithProgrammedSet() {
        const session = newSession()
        const entry = session.addEntry({ id: 'e-1', exerciseId: 'x-1' }, NOW)
        const set = session.addSet(
            entry.id,
            {
                id: 's-1',
                plannedWeight: WeightVO.create(100),
                plannedReps: RepsVO.create(5),
                plannedRpe: RpeVO.create(8),
            },
            NOW,
        )
        return { session, entryId: entry.id, setId: set.id }
    }

    it('starts pending', () => {
        const { session } = sessionWithProgrammedSet()
        expect(session.entries[0]!.sets[0]!.outcome).toBeNull()
    })

    it('records what was performed without touching the targets it deviates from', () => {
        const { session, entryId, setId } = sessionWithProgrammedSet()

        // Told 100×5 @8; managed 95×5 and it felt like a 9.5.
        session.completeSet(
            entryId,
            setId,
            'failed',
            { weight: WeightVO.create(95), reps: RepsVO.create(5), rpe: RpeVO.create(9.5) },
            LATER,
        )

        const set = session.entries[0]!.sets[0]!
        expect(set.outcome).toBe('failed')
        expect(set.weight?.value).toBe(95)
        expect(set.rpe?.value).toBe(9.5)
        expect(set.plannedWeight?.value).toBe(100)
        expect(set.plannedRpe?.value).toBe(8)
        expect(set.e1rmKg).toBeCloseTo(110.83, 2)
        expect(session.updatedAt).toEqual(LATER)
    })

    it('marks a set failed with nothing logged — failing can mean it never went up', () => {
        const { session, entryId, setId } = sessionWithProgrammedSet()

        session.completeSet(entryId, setId, 'failed', {}, LATER)

        const set = session.entries[0]!.sets[0]!
        expect(set.outcome).toBe('failed')
        expect(set.weight).toBeNull()
        expect(set.e1rmKg).toBeNull()
    })

    it('sends a set back to pending through an edit, keeping its logged numbers', () => {
        const { session, entryId, setId } = sessionWithProgrammedSet()
        session.completeSet(entryId, setId, 'success', { weight: WeightVO.create(100), reps: RepsVO.create(5) }, NOW)

        session.updateSet(entryId, setId, { outcome: null }, LATER)

        const set = session.entries[0]!.sets[0]!
        expect(set.outcome).toBeNull()
        expect(set.weight?.value).toBe(100)
        expect(session.updatedAt).toEqual(LATER)
    })

    it('leaves the outcome alone when an edit does not name it', () => {
        const { session, entryId, setId } = sessionWithProgrammedSet()
        session.completeSet(entryId, setId, 'success', { weight: WeightVO.create(100), reps: RepsVO.create(5) }, NOW)

        session.updateSet(entryId, setId, { weight: WeightVO.create(102.5) }, LATER)

        expect(session.entries[0]!.sets[0]!.outcome).toBe('success')
    })

    it('rejects a target carrying both RPE and RIR', () => {
        const session = newSession()
        const entry = session.addEntry({ id: 'e-1', exerciseId: 'x-1' }, NOW)

        expect(() =>
            session.addSet(entry.id, { id: 's-1', plannedRpe: RpeVO.create(8), plannedRir: RirVO.create(2) }, NOW),
        ).toThrow(ConflictingIntensityError)
    })

    it('reports a missing set rather than silently marking nothing', () => {
        const { session, entryId } = sessionWithProgrammedSet()
        expect(() => session.completeSet(entryId, 'nope', 'success', {}, NOW)).toThrow(WorkoutSetNotFoundError)
    })
})

describe('WorkoutSessionAggregate', () => {
    it('starts planned with no entries', () => {
        const session = newSession()
        expect(session.status).toBe('planned')
        expect(session.entries).toHaveLength(0)
        expect(session.updatedAt).toEqual(NOW)
    })

    it('appends entries with incrementing order and bumps updatedAt', () => {
        const session = newSession()
        session.addEntry({ id: 'e-1', exerciseId: 'x-1' }, NOW)
        session.addEntry({ id: 'e-2', exerciseId: 'x-2' }, LATER)

        expect(session.entries.map((e) => e.order)).toEqual([1, 2])
        expect(session.updatedAt).toEqual(LATER)
    })

    it('derives e1RM from the actual weight × reps, leaving planned-only sets null', () => {
        const session = newSession()
        const entry = session.addEntry({ id: 'e-1', exerciseId: 'x-1' }, NOW)

        const logged = session.addSet(
            entry.id,
            { id: 's-1', weight: WeightVO.create(100), reps: RepsVO.create(5), rpe: RpeVO.create(8) },
            NOW,
        )
        const plannedOnly = session.addSet(
            entry.id,
            { id: 's-2', plannedWeight: WeightVO.create(120), plannedReps: RepsVO.create(3) },
            NOW,
        )

        expect(logged.e1rmKg).toBe(116.67)
        expect(plannedOnly.e1rmKg).toBeNull()
        expect(entry.sets.map((s) => s.order)).toEqual([1, 2])
    })

    it('rejects a set carrying both RPE and RIR', () => {
        const session = newSession()
        const entry = session.addEntry({ id: 'e-1', exerciseId: 'x-1' }, NOW)

        expect(() => session.addSet(entry.id, { id: 's-1', rpe: RpeVO.create(8), rir: RirVO.create(2) }, NOW)).toThrow(
            ConflictingIntensityError,
        )
    })

    it('recomputes e1RM when a set is edited and can clear values', () => {
        const session = newSession()
        const entry = session.addEntry({ id: 'e-1', exerciseId: 'x-1' }, NOW)
        const set = session.addSet(entry.id, { id: 's-1', weight: WeightVO.create(100), reps: RepsVO.create(5) }, NOW)

        session.updateSet(entry.id, set.id, { weight: WeightVO.create(110) }, NOW)
        expect(set.e1rmKg).toBe(128.33)

        session.updateSet(entry.id, set.id, { reps: null }, NOW)
        expect(set.e1rmKg).toBeNull()
    })

    it('reindexes set order after a removal', () => {
        const session = newSession()
        const entry = session.addEntry({ id: 'e-1', exerciseId: 'x-1' }, NOW)
        session.addSet(entry.id, { id: 's-1', weight: WeightVO.create(100), reps: RepsVO.create(5) }, NOW)
        session.addSet(entry.id, { id: 's-2', weight: WeightVO.create(90), reps: RepsVO.create(8) }, NOW)

        session.removeSet(entry.id, 's-1', NOW)

        expect(entry.sets.map((s) => s.id)).toEqual(['s-2'])
        expect(entry.sets.map((s) => s.order)).toEqual([1])
    })

    it('reindexes entry order after a removal and rejects unknown ids', () => {
        const session = newSession()
        session.addEntry({ id: 'e-1', exerciseId: 'x-1' }, NOW)
        session.addEntry({ id: 'e-2', exerciseId: 'x-2' }, NOW)

        session.removeEntry('e-1', NOW)

        expect(session.entries.map((e) => e.id)).toEqual(['e-2'])
        expect(session.entries.map((e) => e.order)).toEqual([1])
        expect(() => session.removeEntry('nope', NOW)).toThrow(ExerciseEntryNotFoundError)
        expect(() => session.addSet('nope', { id: 's-x' }, NOW)).toThrow(ExerciseEntryNotFoundError)
        expect(() => session.updateSet('e-2', 'nope', {}, NOW)).toThrow(WorkoutSetNotFoundError)
    })

    it('completes the session', () => {
        const session = newSession()
        session.complete(LATER)
        expect(session.status).toBe('completed')
        expect(session.updatedAt).toEqual(LATER)
    })

    it('edits date and notes, leaving absent fields untouched and clearing notes with null', () => {
        const session = WorkoutSessionAggregate.create({
            id: randomUUID(),
            userId: 'u-1',
            performedAt: NOW,
            notes: 'original',
            now: NOW,
        })

        session.editDetails({ performedAt: LATER }, LATER)
        expect(session.performedAt).toEqual(LATER)
        expect(session.notes).toBe('original')
        expect(session.updatedAt).toEqual(LATER)

        session.editDetails({ notes: 'updated' }, LATER)
        expect(session.notes).toBe('updated')

        session.editDetails({ notes: null }, LATER)
        expect(session.notes).toBeNull()
    })
})
