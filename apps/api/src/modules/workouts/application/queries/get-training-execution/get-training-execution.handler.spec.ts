import { describe, expect, it } from 'vitest'

import { FakeClock, StubTrainingDashboardReadModel } from '../../../../../../tests/doubles/workouts'
import type { ExecutionRow } from '../../ports/training-dashboard.read-model'
import { GetTrainingExecutionHandler } from './get-training-execution.handler'
import { GetTrainingExecutionQuery } from './get-training-execution.query'

const NOW = new Date('2026-04-01T00:00:00.000Z')

function setup(execution: Partial<ExecutionRow> = {}) {
    const stub = new StubTrainingDashboardReadModel({ execution })

    return { stub, handler: new GetTrainingExecutionHandler(stub, new FakeClock(NOW)) }
}

describe('GetTrainingExecutionHandler', () => {
    describe('scoping', () => {
        it('should_measure_adherence_against_the_asking_coach_not_the_athlete', async () => {
            const { stub, handler } = setup()

            await handler.execute(new GetTrainingExecutionQuery('athlete-1', 'coach-1'))

            expect(stub.lastExecutionFilter).toMatchObject({ userId: 'athlete-1', plannedByUserId: 'coach-1' })
        })

        it('should_mirror_the_selected_window_backwards_for_the_comparison', async () => {
            const { stub, handler } = setup()

            // 31 days back from "now" ⇒ the preceding window is the 31 days before that.
            await handler.execute(new GetTrainingExecutionQuery('athlete-1', 'coach-1', '2026-03-01T00:00:00.000Z'))

            expect(stub.lastExecutionFilter?.previousFrom).toEqual(new Date('2026-01-29T00:00:00.000Z'))
        })

        it('should_not_invent_a_previous_window_for_an_unbounded_range', async () => {
            const { stub, handler } = setup()

            await handler.execute(new GetTrainingExecutionQuery('athlete-1', 'coach-1'))

            expect(stub.lastExecutionFilter?.previousFrom).toBeUndefined()
        })
    })

    describe('adherence', () => {
        it('should_divide_completed_by_what_was_actually_due', async () => {
            // Upcoming sessions aren't late yet — counting them would report an
            // athlete as failing on Monday for work due on Friday.
            const { handler } = setup({ plannedCompleted: 14, plannedMissed: 2, plannedUpcoming: 5 })

            const view = await handler.execute(new GetTrainingExecutionQuery('a', 'c'))

            expect(view.adherenceRate).toBe(0.875)
        })

        it('should_report_no_adherence_rather_than_zero_when_nothing_was_programmed', async () => {
            const { handler } = setup({ plannedCompleted: 0, plannedMissed: 0 })

            const view = await handler.execute(new GetTrainingExecutionQuery('a', 'c'))

            expect(view.adherenceRate).toBeNull()
        })

        it('should_report_no_adherence_while_every_programmed_session_is_still_upcoming', async () => {
            const { handler } = setup({ plannedCompleted: 0, plannedMissed: 0, plannedUpcoming: 3 })

            const view = await handler.execute(new GetTrainingExecutionQuery('a', 'c'))

            expect(view.adherenceRate).toBeNull()
            expect(view.plannedUpcoming).toBe(3)
        })
    })

    describe('set outcomes and load', () => {
        it('should_rate_success_over_marked_sets_only', async () => {
            // Pending sets were never judged; they can't count as failures.
            const { handler } = setup({ successSets: 90, failedSets: 10, pendingSets: 40 })

            const view = await handler.execute(new GetTrainingExecutionQuery('a', 'c'))

            expect(view.successRate).toBe(0.9)
        })

        it('should_report_compliance_above_one_when_the_athlete_trained_heavier_than_written', async () => {
            const { handler } = setup({ plannedLoadKg: 10_000, actualLoadKg: 10_800 })

            const view = await handler.execute(new GetTrainingExecutionQuery('a', 'c'))

            expect(view.loadCompliance).toBe(1.08)
        })

        it('should_report_no_compliance_when_nothing_carried_a_plan', async () => {
            const { handler } = setup({ plannedLoadKg: 0, actualLoadKg: 4_200 })

            const view = await handler.execute(new GetTrainingExecutionQuery('a', 'c'))

            expect(view.loadCompliance).toBeNull()
        })
    })

    describe('recency and frequency', () => {
        it('should_count_whole_days_since_the_last_session', async () => {
            const { handler } = setup({ lastSessionAt: new Date('2026-03-29T12:00:00.000Z') })

            const view = await handler.execute(new GetTrainingExecutionQuery('a', 'c'))

            expect(view.daysSinceLastSession).toBe(2)
        })

        it('should_report_no_recency_for_an_athlete_who_never_trained', async () => {
            const { handler } = setup({ lastSessionAt: null })

            const view = await handler.execute(new GetTrainingExecutionQuery('a', 'c'))

            expect(view.daysSinceLastSession).toBeNull()
            expect(view.sessionsPerWeek).toBeNull()
        })

        it('should_average_frequency_over_the_selected_window', async () => {
            const { handler } = setup({ completedSessions: 12 })

            // 28 days ⇒ 4 weeks ⇒ 3 per week.
            const view = await handler.execute(
                new GetTrainingExecutionQuery('a', 'c', '2026-03-04T00:00:00.000Z', '2026-04-01T00:00:00.000Z'),
            )

            expect(view.sessionsPerWeek).toBe(3)
        })

        it('should_not_extrapolate_a_short_window_into_an_inflated_weekly_rate', async () => {
            // Three days with two sessions is "2 per week so far", not "4.7".
            const { handler } = setup({ completedSessions: 2 })

            const view = await handler.execute(
                new GetTrainingExecutionQuery('a', 'c', '2026-03-29T00:00:00.000Z', '2026-04-01T00:00:00.000Z'),
            )

            expect(view.sessionsPerWeek).toBe(2)
        })

        it('should_fall_back_to_the_whole_history_when_no_range_is_selected', async () => {
            const { handler } = setup({
                completedSessions: 20,
                firstSessionAt: new Date('2026-01-21T00:00:00.000Z'),
            })

            // 70 days ⇒ 10 weeks ⇒ 2 per week.
            const view = await handler.execute(new GetTrainingExecutionQuery('a', 'c'))

            expect(view.sessionsPerWeek).toBe(2)
        })
    })

    describe('trends', () => {
        it('should_signal_direction_against_the_preceding_window', async () => {
            const { handler } = setup({
                volumeKg: 112_000,
                previousVolumeKg: 100_000,
                completedSessions: 9,
                previousCompletedSessions: 12,
            })

            const view = await handler.execute(new GetTrainingExecutionQuery('a', 'c', '2026-03-01T00:00:00.000Z'))

            expect(view.volumeChange).toBe(0.12)
            expect(view.sessionsChange).toBe(-0.25)
        })

        it('should_report_no_trend_rather_than_infinite_growth_from_a_standing_start', async () => {
            const { handler } = setup({ volumeKg: 50_000, previousVolumeKg: 0 })

            const view = await handler.execute(new GetTrainingExecutionQuery('a', 'c', '2026-03-01T00:00:00.000Z'))

            expect(view.volumeChange).toBeNull()
        })
    })
})
