import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { eq, sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../../database/schema'
import { WorkoutSessionMother } from '../../../../tests/mothers/workouts'
import { WorkoutSessionAggregate } from '../domain/entities/workout-session.entity'
import { RepsVO } from '../domain/value-objects/reps.vo'
import { WeightVO } from '../domain/value-objects/weight.vo'
import type { SetOutcome } from '../domain/set-outcome'
import { DrizzleTrainingDashboardReadModel } from '../infrastructure/persistence/read-models/drizzle-training-dashboard.read-model'
import { DrizzleWorkoutSessionRepository } from '../infrastructure/persistence/repositories/drizzle-workout-session.repository'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let repository: DrizzleWorkoutSessionRepository
let dashboard: DrizzleTrainingDashboardReadModel
let squatId: string

const NOW = new Date('2026-04-01T00:00:00.000Z')
const ATHLETE = '11111111-1111-4111-8111-111111111111'
const COACH = '22222222-2222-4222-8222-222222222222'
const OTHER_COACH = '33333333-3333-4333-8333-333333333333'

/** A session with one exercise whose sets are exactly what the test needs. */
interface SetSpec {
    plannedWeight?: number
    plannedReps?: number
    weight?: number
    reps?: number
    outcome?: SetOutcome
}

function sessionWith(spec: {
    performedAt: Date
    status?: 'planned' | 'completed'
    plannedByUserId?: string | null
    sets?: SetSpec[]
}): WorkoutSessionAggregate {
    const session = WorkoutSessionMother.empty({
        userId: ATHLETE,
        performedAt: spec.performedAt,
        status: 'planned',
        plannedByUserId: spec.plannedByUserId ?? null,
    })

    if (spec.sets?.length) {
        const entry = session.addEntry({ id: randomUUID(), exerciseId: squatId }, NOW)

        for (const set of spec.sets) {
            const id = randomUUID()
            session.addSet(
                entry.id,
                {
                    id,
                    plannedWeight: set.plannedWeight === undefined ? null : WeightVO.create(set.plannedWeight),
                    plannedReps: set.plannedReps === undefined ? null : RepsVO.create(set.plannedReps),
                    weight: set.weight === undefined ? null : WeightVO.create(set.weight),
                    reps: set.reps === undefined ? null : RepsVO.create(set.reps),
                },
                NOW,
            )

            if (set.outcome) session.completeSet(entry.id, id, set.outcome, {}, NOW)
        }
    }

    if ((spec.status ?? 'completed') === 'completed') session.complete(NOW)

    return session
}

async function save(...aggregates: WorkoutSessionAggregate[]): Promise<void> {
    for (const aggregate of aggregates) await repository.save(aggregate)
}

/** The filter every test starts from: this coach, this athlete, "now" pinned. */
function filter(overrides: { from?: Date; to?: Date; previousFrom?: Date } = {}) {
    return { userId: ATHLETE, plannedByUserId: COACH, now: NOW, ...overrides }
}

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    repository = new DrizzleWorkoutSessionRepository(db)
    dashboard = new DrizzleTrainingDashboardReadModel(db)
    const [squat] = await db.select().from(schema.exercises).where(eq(schema.exercises.category, 'squat')).limit(1)
    squatId = squat!.id
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE workout_sessions RESTART IDENTITY CASCADE`)
})

describe('Athlete execution (integration)', () => {
    describe('adherence', () => {
        it('should_count_a_past_planned_session_as_missed_and_a_future_one_as_upcoming', async () => {
            await save(
                sessionWith({ performedAt: new Date('2026-03-01T00:00:00Z'), plannedByUserId: COACH }),
                sessionWith({ performedAt: new Date('2026-03-10T00:00:00Z'), plannedByUserId: COACH }),
                sessionWith({
                    performedAt: new Date('2026-03-20T00:00:00Z'),
                    status: 'planned',
                    plannedByUserId: COACH,
                }),
                sessionWith({
                    performedAt: new Date('2026-04-10T00:00:00Z'),
                    status: 'planned',
                    plannedByUserId: COACH,
                }),
            )

            const row = await dashboard.execution(filter())

            expect(row).toMatchObject({ plannedCompleted: 2, plannedMissed: 1, plannedUpcoming: 1 })
        })

        it('should_ignore_work_programmed_by_anyone_else', async () => {
            await save(
                sessionWith({ performedAt: new Date('2026-03-01T00:00:00Z'), plannedByUserId: COACH }),
                sessionWith({ performedAt: new Date('2026-03-02T00:00:00Z'), plannedByUserId: OTHER_COACH }),
                // Self-planned: no coach at all.
                sessionWith({ performedAt: new Date('2026-03-03T00:00:00Z') }),
            )

            const row = await dashboard.execution(filter())

            // All three trained; only one was this coach's to be credited for.
            expect(row.plannedCompleted).toBe(1)
            expect(row.completedSessions).toBe(3)
        })

        it('should_count_every_planned_session_when_no_planner_scope_is_given', async () => {
            // A lifter reading their own numbers: sessions they wrote themselves
            // carry a NULL planner, so an equality test would silently drop them
            // and report a self-coached athlete as having no adherence at all.
            await save(
                sessionWith({ performedAt: new Date('2026-03-01T00:00:00Z'), plannedByUserId: COACH }),
                sessionWith({ performedAt: new Date('2026-03-03T00:00:00Z') }),
                sessionWith({ performedAt: new Date('2026-03-05T00:00:00Z'), status: 'planned' }),
            )

            const row = await dashboard.execution({ userId: ATHLETE, now: NOW })

            expect(row).toMatchObject({ plannedCompleted: 2, plannedMissed: 1 })
        })

        it('should_keep_upcoming_sessions_visible_even_when_the_range_ends_today', async () => {
            await save(
                sessionWith({
                    performedAt: new Date('2026-04-20T00:00:00Z'),
                    status: 'planned',
                    plannedByUserId: COACH,
                }),
            )

            const row = await dashboard.execution(filter({ from: new Date('2026-03-01T00:00:00Z'), to: NOW }))

            expect(row.plannedUpcoming).toBe(1)
        })
    })

    describe('set outcomes', () => {
        it('should_separate_marked_outcomes_from_sets_that_were_never_judged', async () => {
            await save(
                sessionWith({
                    performedAt: new Date('2026-03-01T00:00:00Z'),
                    sets: [
                        { weight: 100, reps: 5, outcome: 'success' },
                        { weight: 100, reps: 5, outcome: 'success' },
                        { weight: 120, reps: 1, outcome: 'failed' },
                        // Logged, session closed, never marked.
                        { weight: 80, reps: 8 },
                    ],
                }),
            )

            const row = await dashboard.execution(filter())

            expect(row).toMatchObject({ successSets: 2, failedSets: 1, pendingSets: 1 })
        })
    })

    describe('load compliance', () => {
        it('should_compare_executed_against_programmed_load', async () => {
            await save(
                sessionWith({
                    performedAt: new Date('2026-03-01T00:00:00Z'),
                    sets: [
                        // Programmed 100×5 = 500, did 110×5 = 550.
                        { plannedWeight: 100, plannedReps: 5, weight: 110, reps: 5, outcome: 'success' },
                        // Programmed 100×5 = 500, did 90×5 = 450.
                        { plannedWeight: 100, plannedReps: 5, weight: 90, reps: 5, outcome: 'success' },
                    ],
                }),
            )

            const row = await dashboard.execution(filter())

            expect(row.plannedLoadKg).toBe(1000)
            expect(row.actualLoadKg).toBe(1000)
        })

        it('should_count_a_skipped_set_inside_a_finished_session_as_zero_executed', async () => {
            await save(
                sessionWith({
                    performedAt: new Date('2026-03-01T00:00:00Z'),
                    sets: [
                        { plannedWeight: 100, plannedReps: 5, weight: 100, reps: 5, outcome: 'success' },
                        // Programmed but never performed — the athlete stopped early.
                        { plannedWeight: 100, plannedReps: 5 },
                    ],
                }),
            )

            const row = await dashboard.execution(filter())

            expect(row.plannedLoadKg).toBe(1000)
            expect(row.actualLoadKg).toBe(500)
            // The skipped set still counts towards the denominator's set count.
            expect(row.plannedSets).toBe(2)
        })

        it('should_not_let_a_session_that_never_happened_drag_compliance_down_twice', async () => {
            await save(
                sessionWith({
                    performedAt: new Date('2026-03-01T00:00:00Z'),
                    sets: [{ plannedWeight: 100, plannedReps: 5, weight: 100, reps: 5, outcome: 'success' }],
                }),
                // Missed entirely: adherence already accounts for this one.
                sessionWith({
                    performedAt: new Date('2026-03-05T00:00:00Z'),
                    status: 'planned',
                    plannedByUserId: COACH,
                    sets: [{ plannedWeight: 200, plannedReps: 5 }],
                }),
            )

            const row = await dashboard.execution(filter())

            expect(row.plannedLoadKg).toBe(500)
            expect(row.actualLoadKg).toBe(500)
        })
    })

    describe('windows', () => {
        it('should_split_the_current_window_from_the_one_before_it_in_a_single_pass', async () => {
            await save(
                // Previous window: [Feb 1, Mar 1)
                sessionWith({
                    performedAt: new Date('2026-02-10T00:00:00Z'),
                    sets: [{ weight: 100, reps: 5, outcome: 'success' }],
                }),
                // Current window: [Mar 1, …]
                sessionWith({
                    performedAt: new Date('2026-03-10T00:00:00Z'),
                    sets: [{ weight: 100, reps: 10, outcome: 'success' }],
                }),
            )

            const row = await dashboard.execution(
                filter({ from: new Date('2026-03-01T00:00:00Z'), previousFrom: new Date('2026-02-01T00:00:00Z') }),
            )

            expect(row).toMatchObject({
                volumeKg: 1000,
                previousVolumeKg: 500,
                completedSessions: 1,
                previousCompletedSessions: 1,
                successSets: 1,
            })
        })

        it('should_report_the_last_session_even_when_it_falls_outside_the_selected_range', async () => {
            // The whole point: a 30-day window must still be able to say
            // "last trained in January", which is exactly what it can't show.
            await save(sessionWith({ performedAt: new Date('2026-01-15T00:00:00Z') }))

            const row = await dashboard.execution(filter({ from: new Date('2026-03-01T00:00:00Z') }))

            expect(row.completedSessions).toBe(0)
            expect(row.lastSessionAt?.toISOString()).toBe('2026-01-15T00:00:00.000Z')
            expect(row.firstSessionAt?.toISOString()).toBe('2026-01-15T00:00:00.000Z')
        })
    })

    describe('weekly series', () => {
        it('should_show_when_the_athlete_slipped_not_just_how_much', async () => {
            // Two weeks kept, one missed entirely — the same 2/3 that the
            // aggregate rate would flatten into a single number.
            await save(
                sessionWith({ performedAt: new Date('2026-03-02T00:00:00Z'), plannedByUserId: COACH }),
                sessionWith({ performedAt: new Date('2026-03-09T00:00:00Z'), plannedByUserId: COACH }),
                sessionWith({
                    performedAt: new Date('2026-03-16T00:00:00Z'),
                    status: 'planned',
                    plannedByUserId: COACH,
                }),
            )

            const series = await dashboard.executionSeries(filter())

            expect(series.map((w) => [w.bucketStart.toISOString(), w.plannedCompleted, w.plannedMissed])).toEqual([
                ['2026-03-02T00:00:00.000Z', 1, 0],
                ['2026-03-09T00:00:00.000Z', 1, 0],
                ['2026-03-16T00:00:00.000Z', 0, 1],
            ])
        })

        it('should_pair_programmed_load_against_executed_load_in_the_same_week', async () => {
            await save(
                sessionWith({
                    performedAt: new Date('2026-03-02T00:00:00Z'),
                    sets: [{ plannedWeight: 100, plannedReps: 5, weight: 90, reps: 5, outcome: 'success' }],
                }),
            )

            const [week] = await dashboard.executionSeries(filter())

            expect(week).toMatchObject({ plannedLoadKg: 500, actualLoadKg: 450 })
        })

        it('should_bucket_self_planned_weeks_too_when_unscoped', async () => {
            await save(
                sessionWith({ performedAt: new Date('2026-03-02T00:00:00Z') }),
                sessionWith({ performedAt: new Date('2026-03-09T00:00:00Z'), status: 'planned' }),
            )

            const series = await dashboard.executionSeries({ userId: ATHLETE, now: NOW })

            expect(series.map((w) => [w.plannedCompleted, w.plannedMissed])).toEqual([
                [1, 0],
                [0, 1],
            ])
        })

        it('should_keep_a_week_that_only_has_one_of_the_two_halves', async () => {
            // A missed session has no sets, so it exists only in the adherence
            // query — the merge has to carry it through with zeroed load.
            await save(
                sessionWith({
                    performedAt: new Date('2026-03-02T00:00:00Z'),
                    status: 'planned',
                    plannedByUserId: COACH,
                }),
            )

            const series = await dashboard.executionSeries(filter())

            expect(series).toHaveLength(1)
            expect(series[0]).toMatchObject({ plannedMissed: 1, plannedLoadKg: 0, actualLoadKg: 0 })
        })
    })

    it('should_scope_everything_to_the_athlete_asked_about', async () => {
        const stranger = WorkoutSessionMother.withTree(squatId, { userId: randomUUID() })
        await save(stranger)

        const row = await dashboard.execution(filter())

        expect(row).toMatchObject({ completedSessions: 0, volumeKg: 0, successSets: 0, lastSessionAt: null })
    })
})
