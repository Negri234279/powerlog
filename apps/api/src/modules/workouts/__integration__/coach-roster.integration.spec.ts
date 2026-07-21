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
import { DrizzleCoachRosterReadModel } from '../infrastructure/persistence/read-models/drizzle-coach-roster.read-model'
import { DrizzleWorkoutSessionRepository } from '../infrastructure/persistence/repositories/drizzle-workout-session.repository'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let repository: DrizzleWorkoutSessionRepository
let roster: DrizzleCoachRosterReadModel
let squatId: string

const NOW = new Date('2026-04-01T00:00:00.000Z')
const COACH = '22222222-2222-4222-8222-222222222222'
const ANA = '11111111-1111-4111-8111-111111111111'
const BEN = '33333333-3333-4333-8333-333333333333'

function sessionFor(
    userId: string,
    spec: { performedAt: Date; status?: 'planned' | 'completed'; plannedBy?: string; weight?: number; reps?: number },
): WorkoutSessionAggregate {
    const session = WorkoutSessionMother.empty({
        userId,
        performedAt: spec.performedAt,
        status: 'planned',
        plannedByUserId: spec.plannedBy ?? null,
    })

    if (spec.weight !== undefined && spec.reps !== undefined) {
        const entry = session.addEntry({ id: randomUUID(), exerciseId: squatId }, NOW)
        session.addSet(
            entry.id,
            { id: randomUUID(), weight: WeightVO.create(spec.weight), reps: RepsVO.create(spec.reps) },
            NOW,
        )
    }

    if ((spec.status ?? 'completed') === 'completed') session.complete(NOW)

    return session
}

async function save(...aggregates: WorkoutSessionAggregate[]): Promise<void> {
    for (const aggregate of aggregates) await repository.save(aggregate)
}

function filter(athleteIds: string[], overrides: { from?: Date; to?: Date } = {}) {
    return { athleteIds, coachId: COACH, now: NOW, ...overrides }
}

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    repository = new DrizzleWorkoutSessionRepository(db)
    roster = new DrizzleCoachRosterReadModel(db)
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

describe('Coach roster (integration)', () => {
    it('should_keep_each_athletes_rollups_to_themselves', async () => {
        await save(
            sessionFor(ANA, { performedAt: new Date('2026-03-20T00:00:00Z'), weight: 100, reps: 5 }),
            sessionFor(BEN, { performedAt: new Date('2026-03-21T00:00:00Z'), weight: 60, reps: 10 }),
        )

        const rows = await roster.roster(filter([ANA, BEN]))

        expect(rows.find((r) => r.athleteId === ANA)).toMatchObject({ volumeKg: 500, completedSessions: 1 })
        expect(rows.find((r) => r.athleteId === BEN)).toMatchObject({ volumeKg: 600, completedSessions: 1 })
    })

    it('should_return_a_row_for_an_athlete_who_has_never_logged_anything', async () => {
        // They produce no rows in either query; dropping them would silently
        // remove the newest athletes from their coach's roster.
        const rows = await roster.roster(filter([ANA]))

        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({ athleteId: ANA, lastSessionAt: null, nextSessionAt: null, volumeKg: 0 })
    })

    it('should_not_touch_the_database_for_an_empty_roster', async () => {
        expect(await roster.roster(filter([]))).toEqual([])
    })

    it('should_count_adherence_only_against_this_coachs_programming', async () => {
        await save(
            sessionFor(ANA, { performedAt: new Date('2026-03-01T00:00:00Z'), plannedBy: COACH }),
            sessionFor(ANA, { performedAt: new Date('2026-03-05T00:00:00Z'), status: 'planned', plannedBy: COACH }),
            // Self-planned and skipped: their business, not the coach's adherence.
            sessionFor(ANA, { performedAt: new Date('2026-03-06T00:00:00Z'), status: 'planned' }),
        )

        const [row] = await roster.roster(filter([ANA]))

        expect(row).toMatchObject({ plannedCompleted: 1, plannedMissed: 1, completedSessions: 1 })
    })

    it('should_look_past_the_range_for_the_last_and_next_session', async () => {
        // The whole point: a 30-day window must still be able to say "last trained
        // in January" and "next session is next month".
        await save(
            sessionFor(ANA, { performedAt: new Date('2026-01-10T00:00:00Z') }),
            sessionFor(ANA, { performedAt: new Date('2026-05-20T00:00:00Z'), status: 'planned', plannedBy: COACH }),
        )

        const [row] = await roster.roster(filter([ANA], { from: new Date('2026-03-01T00:00:00Z'), to: NOW }))

        expect(row!.completedSessions).toBe(0)
        expect(row!.lastSessionAt?.toISOString()).toBe('2026-01-10T00:00:00.000Z')
        expect(row!.nextSessionAt?.toISOString()).toBe('2026-05-20T00:00:00.000Z')
    })

    it('should_pick_the_soonest_upcoming_session_not_just_any', async () => {
        await save(
            sessionFor(ANA, { performedAt: new Date('2026-06-01T00:00:00Z'), status: 'planned', plannedBy: COACH }),
            sessionFor(ANA, { performedAt: new Date('2026-04-15T00:00:00Z'), status: 'planned', plannedBy: COACH }),
        )

        const [row] = await roster.roster(filter([ANA]))

        expect(row!.nextSessionAt?.toISOString()).toBe('2026-04-15T00:00:00.000Z')
    })

    it('should_split_the_current_window_from_the_preceding_one_for_the_trend', async () => {
        await save(
            // Previous window: [Feb 1, Mar 1)
            sessionFor(ANA, { performedAt: new Date('2026-02-10T00:00:00Z'), weight: 100, reps: 5 }),
            // Current window: [Mar 1, Apr 1]
            sessionFor(ANA, { performedAt: new Date('2026-03-10T00:00:00Z'), weight: 100, reps: 10 }),
        )

        const [row] = await roster.roster(filter([ANA], { from: new Date('2026-03-01T00:00:00Z'), to: NOW }))

        expect(row).toMatchObject({ volumeKg: 1000, previousVolumeKg: 500 })
    })
})
