import { randomUUID } from 'node:crypto'

import { beforeEach, describe, expect, it } from 'vitest'

import { ApplySessionPlanCommand } from '../../../../../shared/contracts/apply-session-plan.command'
import type { PrescribedSet } from '../../../../../shared/contracts/session-plan-applier'
import { FakeClock, FakeIdGenerator, InMemoryWorkoutSessionRepository } from '../../../../../../tests/doubles/workouts'
import { FakeCoachLinks } from '../../../../../../tests/doubles/shared'
import { WorkoutSessionMother } from '../../../../../../tests/mothers/workouts'
import type { WorkoutSessionAggregate } from '../../../domain/entities/workout-session.entity'
import { ExerciseEntryNotFoundError, WorkoutSessionNotFoundError } from '../../../domain/errors/workouts.errors'
import { ApplySessionPlanHandler } from './apply-session-plan.handler'

const USER_ID = randomUUID()
const EXERCISE_ID = randomUUID()
const NOW = new Date('2026-01-01T00:00:00.000Z')

/** A planned session with one exercise and two empty sets, ready to program. */
function plannedSession(overrides: { userId?: string; plannedByUserId?: string } = {}): WorkoutSessionAggregate {
    const session = WorkoutSessionMother.empty({
        userId: overrides.userId ?? USER_ID,
        plannedByUserId: overrides.plannedByUserId ?? null,
        status: 'planned',
    })
    const entry = session.addEntry({ id: randomUUID(), exerciseId: EXERCISE_ID }, NOW)
    session.addSet(entry.id, { id: randomUUID() }, NOW)
    session.addSet(entry.id, { id: randomUUID(), notes: 'athlete wrote this' }, NOW)

    return session
}

const entryOf = (session: WorkoutSessionAggregate) => session.entries[0]!
const setsOf = (session: WorkoutSessionAggregate) => session.entries[0]!.sets

const prescribe = (entryId: string, order: number, overrides: Partial<PrescribedSet> = {}): PrescribedSet => ({
    entryId,
    order,
    plannedWeightKg: 100,
    plannedReps: 5,
    rpe: 8,
    rir: null,
    notes: null,
    ...overrides,
})

describe('ApplySessionPlanHandler', () => {
    let sessions: InMemoryWorkoutSessionRepository
    let coachLinks: FakeCoachLinks

    const buildHandler = () => new ApplySessionPlanHandler(sessions, new FakeClock(), new FakeIdGenerator(), coachLinks)

    beforeEach(() => {
        sessions = new InMemoryWorkoutSessionRepository()
        coachLinks = new FakeCoachLinks()
    })

    it('fills the existing sets positionally', async () => {
        const session = plannedSession()
        await sessions.save(session)
        const entryId = entryOf(session).id
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [
            prescribe(entryId, 1),
            prescribe(entryId, 2, { plannedWeightKg: 90, rpe: null, rir: 2 }),
        ])

        await buildHandler().execute(command)

        const sets = setsOf((await sessions.findById(session.id))!)
        expect(sets).toHaveLength(2)
        expect(sets[0]!.plannedWeight?.value).toBe(100)
        expect(sets[1]!.plannedWeight?.value).toBe(90)
        // A prescription is a target: it lands in plannedRir, never in the rir
        // the athlete will report once they've actually done the set.
        expect(sets[1]!.plannedRir?.value).toBe(2)
        expect(sets[1]!.rir).toBeNull()
    })

    it('creates the sets the plan proposes beyond what the session has', async () => {
        const session = plannedSession()
        await sessions.save(session)
        const entryId = entryOf(session).id
        // The session has two sets; the model prescribed four.
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [
            prescribe(entryId, 1),
            prescribe(entryId, 2),
            prescribe(entryId, 3, { plannedWeightKg: 90 }),
            prescribe(entryId, 4, { plannedWeightKg: 85 }),
        ])

        await buildHandler().execute(command)

        const sets = setsOf((await sessions.findById(session.id))!)
        expect(sets).toHaveLength(4)
        expect(sets.map((set) => set.order)).toEqual([1, 2, 3, 4])
        expect(sets[3]!.plannedWeight?.value).toBe(85)
        // A created set is planned-only: nothing performed on it.
        expect(sets[3]!.weight).toBeNull()
    })

    it('programs an entry that has no sets at all', async () => {
        const session = WorkoutSessionMother.empty({ userId: USER_ID, status: 'planned' })
        const entry = session.addEntry({ id: randomUUID(), exerciseId: EXERCISE_ID }, NOW)
        await sessions.save(session)
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [
            prescribe(entry.id, 1),
            prescribe(entry.id, 2),
            prescribe(entry.id, 3),
        ])

        await buildHandler().execute(command)

        expect(setsOf((await sessions.findById(session.id))!)).toHaveLength(3)
    })

    it('leaves extra existing sets untouched when the plan proposes fewer', async () => {
        const session = plannedSession()
        await sessions.save(session)
        const entryId = entryOf(session).id
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [prescribe(entryId, 1)])

        await buildHandler().execute(command)

        const sets = setsOf((await sessions.findById(session.id))!)
        // Never deletes what the athlete created.
        expect(sets).toHaveLength(2)
        expect(sets[1]!.plannedWeight).toBeNull()
    })

    it('never touches performed values', async () => {
        const session = plannedSession()
        await sessions.save(session)
        const entryId = entryOf(session).id
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [prescribe(entryId, 1)])

        await buildHandler().execute(command)

        const first = setsOf((await sessions.findById(session.id))!)[0]!
        expect(first.weight).toBeNull()
        expect(first.reps).toBeNull()
    })

    it('leaves the athlete’s own note alone when the plan carries none', async () => {
        const session = plannedSession()
        await sessions.save(session)
        const entryId = entryOf(session).id
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [
            prescribe(entryId, 1),
            prescribe(entryId, 2, { notes: null }),
        ])

        await buildHandler().execute(command)

        expect(setsOf((await sessions.findById(session.id))!)[1]!.notes).toBe('athlete wrote this')
    })

    it('replaces the note when the plan carries one', async () => {
        const session = plannedSession()
        await sessions.save(session)
        const entryId = entryOf(session).id
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [
            prescribe(entryId, 1),
            prescribe(entryId, 2, { notes: 'back-off' }),
        ])

        await buildHandler().execute(command)

        expect(setsOf((await sessions.findById(session.id))!)[1]!.notes).toBe('back-off')
    })

    it('rejects a plan naming an entry that is not in the session, changing nothing', async () => {
        const session = plannedSession()
        await sessions.save(session)
        const entryId = entryOf(session).id
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [
            prescribe(entryId, 1),
            prescribe(randomUUID(), 1),
        ])

        await expect(buildHandler().execute(command)).rejects.toThrow(ExerciseEntryNotFoundError)
        expect(setsOf((await sessions.findById(session.id))!)[0]!.plannedWeight).toBeNull()
    })

    it('refuses to program another user’s session', async () => {
        const session = plannedSession({ userId: randomUUID() })
        await sessions.save(session)
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [prescribe(entryOf(session).id, 1)])

        await expect(buildHandler().execute(command)).rejects.toThrow(WorkoutSessionNotFoundError)
    })

    it('lets the coach who planned it write the plan onto the athlete’s session', async () => {
        const athleteId = randomUUID()
        const session = plannedSession({ userId: athleteId, plannedByUserId: USER_ID })
        await sessions.save(session)
        coachLinks.link(USER_ID, athleteId)
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [prescribe(entryOf(session).id, 1)])

        await buildHandler().execute(command)

        const saved = await sessions.findById(session.id)
        expect(setsOf(saved!)[0]!.plannedWeight?.value).toBe(100)
        expect(setsOf(saved!)[0]!.plannedReps?.value).toBe(5)
    })

    it('refuses a coach who no longer coaches the athlete', async () => {
        const athleteId = randomUUID()
        const session = plannedSession({ userId: athleteId, plannedByUserId: USER_ID })
        await sessions.save(session)
        // The link is gone; a draft generated while it existed must not still land.
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [prescribe(entryOf(session).id, 1)])

        await expect(buildHandler().execute(command)).rejects.toThrow(WorkoutSessionNotFoundError)
    })

    it('refuses to rewrite a session already trained', async () => {
        const session = plannedSession()
        const entryId = entryOf(session).id
        session.complete(NOW)
        await sessions.save(session)
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [prescribe(entryId, 1)])

        await expect(buildHandler().execute(command)).rejects.toThrow(WorkoutSessionNotFoundError)
    })

    it('refuses a session that does not exist', async () => {
        const command = new ApplySessionPlanCommand(USER_ID, randomUUID(), [prescribe(randomUUID(), 1)])

        await expect(buildHandler().execute(command)).rejects.toThrow(WorkoutSessionNotFoundError)
    })
})
