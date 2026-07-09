import { randomUUID } from 'node:crypto'

import { beforeEach, describe, expect, it } from 'vitest'

import { GetSessionPlanContextQuery } from '../../../../../shared/contracts/get-session-plan-context.query'
import {
    InMemoryExerciseRepository,
    InMemoryWorkoutSessionRepository,
    StubExerciseSessionHistoryReadModel,
} from '../../../../../../tests/doubles/workouts'
import { ExerciseMother, WorkoutSessionMother } from '../../../../../../tests/mothers/workouts'
import type { WorkoutSessionAggregate } from '../../../domain/entities/workout-session.entity'
import type { ExerciseSessionHistoryRow } from '../../ports/exercise-session-history.read-model'
import { GetSessionPlanContextHandler } from './get-session-plan-context.handler'

const USER_ID = randomUUID()
const EXERCISE_ID = randomUUID()
const NOW = new Date('2026-01-01T00:00:00.000Z')

function plannedSession(overrides: { userId?: string } = {}): WorkoutSessionAggregate {
    const session = WorkoutSessionMother.empty({
        userId: overrides.userId ?? USER_ID,
        status: 'planned',
        notes: 'heavy day',
    })
    const entry = session.addEntry({ id: randomUUID(), exerciseId: EXERCISE_ID, notes: 'work up to a top set' }, NOW)
    session.addSet(entry.id, { id: randomUUID() }, NOW)

    return session
}

const historyRow = (): ExerciseSessionHistoryRow => ({
    sessionId: randomUUID(),
    performedAt: new Date('2025-12-25T00:00:00.000Z'),
    status: 'completed',
    sessionNotes: 'slept badly',
    exerciseNotes: 'belt from set 2',
    sets: [
        {
            plannedWeightKg: 100,
            plannedReps: 5,
            weightKg: 102.5,
            reps: 5,
            rpe: 8,
            rir: null,
            e1rmKg: 118.5,
            notes: 'felt smooth',
        },
    ],
})

describe('GetSessionPlanContextHandler', () => {
    let sessions: InMemoryWorkoutSessionRepository
    let exercises: InMemoryExerciseRepository
    let history: StubExerciseSessionHistoryReadModel

    const buildHandler = () => new GetSessionPlanContextHandler(sessions, exercises, history)

    beforeEach(() => {
        sessions = new InMemoryWorkoutSessionRepository()
        exercises = new InMemoryExerciseRepository([ExerciseMother.create({ id: EXERCISE_ID, name: 'Back Squat' })])
        history = new StubExerciseSessionHistoryReadModel([historyRow()])
    })

    it('names the lift and carries the session’s own notes', async () => {
        const session = plannedSession()
        await sessions.save(session)
        const query = new GetSessionPlanContextQuery(USER_ID, session.id, 6)

        const context = await buildHandler().execute(query)

        expect(context?.sessionNotes).toBe('heavy day')
        expect(context?.exercises[0]?.name).toBe('Back Squat')
        expect(context?.exercises[0]?.entryNotes).toBe('work up to a top set')
    })

    it('carries the notes from the history — the point of the whole context', async () => {
        const session = plannedSession()
        await sessions.save(session)
        const query = new GetSessionPlanContextQuery(USER_ID, session.id, 6)

        const context = await buildHandler().execute(query)

        const past = context?.exercises[0]?.history[0]
        expect(past?.sessionNotes).toBe('slept badly')
        expect(past?.exerciseNotes).toBe('belt from set 2')
        expect(past?.sets[0]?.notes).toBe('felt smooth')
    })

    it('excludes the session being programmed from its own history', async () => {
        const session = plannedSession()
        await sessions.save(session)
        const query = new GetSessionPlanContextQuery(USER_ID, session.id, 6)

        await buildHandler().execute(query)

        expect(history.lastFilter?.excludeSessionId).toBe(session.id)
        expect(history.lastFilter?.limit).toBe(6)
    })

    it('lists the sets that need programming, with their ids', async () => {
        const session = plannedSession()
        await sessions.save(session)
        const query = new GetSessionPlanContextQuery(USER_ID, session.id, 6)

        const context = await buildHandler().execute(query)

        expect(context?.exercises[0]?.sets).toEqual([
            {
                setId: session.entries[0]!.sets[0]!.id,
                order: 1,
                plannedWeightKg: null,
                plannedReps: null,
                rpe: null,
                rir: null,
                notes: null,
            },
        ])
    })

    it('returns null for another user’s session', async () => {
        const session = plannedSession({ userId: randomUUID() })
        await sessions.save(session)
        const query = new GetSessionPlanContextQuery(USER_ID, session.id, 6)

        await expect(buildHandler().execute(query)).resolves.toBeNull()
    })

    it('returns null for a session already trained', async () => {
        const session = plannedSession()
        session.complete(NOW)
        await sessions.save(session)
        const query = new GetSessionPlanContextQuery(USER_ID, session.id, 6)

        await expect(buildHandler().execute(query)).resolves.toBeNull()
    })

    it('returns null for a session that does not exist', async () => {
        const query = new GetSessionPlanContextQuery(USER_ID, randomUUID(), 6)

        await expect(buildHandler().execute(query)).resolves.toBeNull()
    })

    it('still programs an entry whose exercise was deleted', async () => {
        exercises = new InMemoryExerciseRepository([])
        const session = plannedSession()
        await sessions.save(session)
        const query = new GetSessionPlanContextQuery(USER_ID, session.id, 6)

        const context = await buildHandler().execute(query)

        expect(context?.exercises[0]?.name).toBe('Unknown exercise')
    })
})
