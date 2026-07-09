import { randomUUID } from 'node:crypto'

import { beforeEach, describe, expect, it } from 'vitest'

import { ApplySessionPlanCommand } from '../../../../../shared/contracts/apply-session-plan.command'
import type { PrescribedSet } from '../../../../../shared/contracts/session-plan-applier'
import { FakeClock, InMemoryWorkoutSessionRepository } from '../../../../../../tests/doubles/workouts'
import { WorkoutSessionMother } from '../../../../../../tests/mothers/workouts'
import type { WorkoutSessionAggregate } from '../../../domain/entities/workout-session.entity'
import { WorkoutSessionNotFoundError, WorkoutSetNotFoundError } from '../../../domain/errors/workouts.errors'
import { ApplySessionPlanHandler } from './apply-session-plan.handler'

const USER_ID = randomUUID()
const EXERCISE_ID = randomUUID()
const NOW = new Date('2026-01-01T00:00:00.000Z')

/** A planned session with one exercise and two empty sets, ready to program. */
function plannedSession(overrides: { userId?: string } = {}): WorkoutSessionAggregate {
    const session = WorkoutSessionMother.empty({ userId: overrides.userId ?? USER_ID, status: 'planned' })
    const entry = session.addEntry({ id: randomUUID(), exerciseId: EXERCISE_ID }, NOW)
    session.addSet(entry.id, { id: randomUUID() }, NOW)
    session.addSet(entry.id, { id: randomUUID(), notes: 'athlete wrote this' }, NOW)

    return session
}

const setsOf = (session: WorkoutSessionAggregate) => session.entries[0]!.sets

const prescribe = (setId: string, overrides: Partial<PrescribedSet> = {}): PrescribedSet => ({
    setId,
    plannedWeightKg: 100,
    plannedReps: 5,
    rpe: 8,
    rir: null,
    notes: null,
    ...overrides,
})

describe('ApplySessionPlanHandler', () => {
    let sessions: InMemoryWorkoutSessionRepository

    const buildHandler = () => new ApplySessionPlanHandler(sessions, new FakeClock())

    beforeEach(() => {
        sessions = new InMemoryWorkoutSessionRepository()
    })

    it('writes the prescribed targets onto the planned sets', async () => {
        const session = plannedSession()
        await sessions.save(session)
        const [first] = setsOf(session)
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [prescribe(first!.id)])

        await buildHandler().execute(command)

        const updated = setsOf((await sessions.findById(session.id))!)[0]!
        expect(updated.plannedWeight?.value).toBe(100)
        expect(updated.plannedReps?.value).toBe(5)
        expect(updated.rpe?.value).toBe(8)
    })

    it('never touches performed values', async () => {
        const session = plannedSession()
        await sessions.save(session)
        const [first] = setsOf(session)
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [prescribe(first!.id)])

        await buildHandler().execute(command)

        const updated = setsOf((await sessions.findById(session.id))!)[0]!
        expect(updated.weight).toBeNull()
        expect(updated.reps).toBeNull()
    })

    it('leaves the athlete’s own note alone when the plan carries none', async () => {
        const session = plannedSession()
        await sessions.save(session)
        const second = setsOf(session)[1]!
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [prescribe(second.id, { notes: null })])

        await buildHandler().execute(command)

        expect(setsOf((await sessions.findById(session.id))!)[1]!.notes).toBe('athlete wrote this')
    })

    it('replaces the note when the plan carries one', async () => {
        const session = plannedSession()
        await sessions.save(session)
        const second = setsOf(session)[1]!
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [prescribe(second.id, { notes: 'backoff' })])

        await buildHandler().execute(command)

        expect(setsOf((await sessions.findById(session.id))!)[1]!.notes).toBe('backoff')
    })

    it('rejects a plan naming a set that is not in the session, changing nothing', async () => {
        const session = plannedSession()
        await sessions.save(session)
        const [first] = setsOf(session)
        // A stale plan: one real set, one that has since been deleted.
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [
            prescribe(first!.id),
            prescribe(randomUUID()),
        ])

        await expect(buildHandler().execute(command)).rejects.toThrow(WorkoutSetNotFoundError)
        expect(setsOf((await sessions.findById(session.id))!)[0]!.plannedWeight).toBeNull()
    })

    it('refuses to program another user’s session', async () => {
        const session = plannedSession({ userId: randomUUID() })
        await sessions.save(session)
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [prescribe(setsOf(session)[0]!.id)])

        await expect(buildHandler().execute(command)).rejects.toThrow(WorkoutSessionNotFoundError)
    })

    it('refuses to rewrite a session already trained', async () => {
        const session = plannedSession()
        const setId = setsOf(session)[0]!.id
        session.complete(NOW)
        await sessions.save(session)
        const command = new ApplySessionPlanCommand(USER_ID, session.id, [prescribe(setId)])

        await expect(buildHandler().execute(command)).rejects.toThrow(WorkoutSessionNotFoundError)
    })

    it('refuses a session that does not exist', async () => {
        const command = new ApplySessionPlanCommand(USER_ID, randomUUID(), [prescribe(randomUUID())])

        await expect(buildHandler().execute(command)).rejects.toThrow(WorkoutSessionNotFoundError)
    })
})
