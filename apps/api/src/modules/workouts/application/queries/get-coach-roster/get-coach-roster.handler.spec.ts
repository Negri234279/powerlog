import { describe, expect, it } from 'vitest'

import { FakeCoachLinks } from '../../../../../../tests/doubles/shared'
import { FakeClock, StubCoachRosterReadModel } from '../../../../../../tests/doubles/workouts'
import type { CoachRosterRow } from '../../ports/coach-roster.read-model'
import { GetCoachRosterHandler } from './get-coach-roster.handler'
import { GetCoachRosterQuery } from './get-coach-roster.query'

const NOW = new Date('2026-04-01T00:00:00.000Z')
const COACH = 'coach-1'
const ATHLETE = 'athlete-1'

function daysAgo(days: number): Date {
    return new Date(NOW.getTime() - days * 86_400_000)
}

/** One athlete, linked `coachedDays` ago, with whatever rollups the test needs. */
function setup(row: Partial<CoachRosterRow> = {}, coachedDays = 90) {
    const links = new FakeCoachLinks().link(COACH, ATHLETE, daysAgo(coachedDays))
    const roster = new StubCoachRosterReadModel({ [ATHLETE]: row })

    return { roster, links, handler: new GetCoachRosterHandler(roster, links, new FakeClock(NOW)) }
}

async function attentionFor(row: Partial<CoachRosterRow>, coachedDays = 90) {
    const { handler } = setup(row, coachedDays)
    const [entry] = await handler.execute(new GetCoachRosterQuery(COACH))

    return entry!.attention
}

describe('GetCoachRosterHandler', () => {
    describe('scoping', () => {
        it('should_roll_up_only_the_athletes_this_coach_actually_coaches', async () => {
            const links = new FakeCoachLinks().link(COACH, ATHLETE).link('other-coach', 'someone-else')
            const roster = new StubCoachRosterReadModel()
            const handler = new GetCoachRosterHandler(roster, links, new FakeClock(NOW))

            await handler.execute(new GetCoachRosterQuery(COACH))

            expect(roster.lastFilter).toMatchObject({ athleteIds: [ATHLETE], coachId: COACH })
        })

        it('should_return_an_empty_roster_without_asking_the_database', async () => {
            const roster = new StubCoachRosterReadModel()
            const handler = new GetCoachRosterHandler(roster, new FakeCoachLinks(), new FakeClock(NOW))

            expect(await handler.execute(new GetCoachRosterQuery(COACH))).toEqual([])
        })
    })

    describe('attention — what gets flagged', () => {
        it('should_flag_an_athlete_who_has_not_trained_for_over_a_week', async () => {
            expect(await attentionFor({ lastSessionAt: daysAgo(12) })).toBe('stale')
        })

        it('should_flag_an_athlete_who_never_trained_once_they_have_had_time_to', async () => {
            expect(await attentionFor({ lastSessionAt: null }, 30)).toBe('neverTrained')
        })

        it('should_flag_a_falling_adherence_backed_by_enough_sessions', async () => {
            expect(await attentionFor({ lastSessionAt: daysAgo(1), plannedCompleted: 2, plannedMissed: 3 })).toBe(
                'lowAdherence',
            )
        })
    })

    describe('attention — what deliberately is not', () => {
        it('should_not_flag_a_lifter_who_is_merely_a_few_days_out', async () => {
            // Training three times a week means being four days out on a Thursday.
            // Flagging that paints most of a healthy roster orange.
            expect(await attentionFor({ lastSessionAt: daysAgo(5) })).toBe('none')
        })

        it('should_not_flag_an_athlete_who_only_joined_this_week', async () => {
            expect(await attentionFor({ lastSessionAt: null }, 2)).toBe('none')
        })

        it('should_not_flag_poor_adherence_over_too_few_sessions', async () => {
            // 0/2 is arithmetic, not evidence.
            expect(await attentionFor({ lastSessionAt: daysAgo(1), plannedCompleted: 0, plannedMissed: 2 })).toBe(
                'none',
            )
        })

        it('should_not_flag_an_athlete_the_coach_programmed_nothing_for', async () => {
            expect(await attentionFor({ lastSessionAt: daysAgo(1) })).toBe('none')
        })

        it('should_report_one_reason_even_when_several_could_apply', async () => {
            // Stale AND failing their plan: the row gets the more urgent one, never both.
            expect(await attentionFor({ lastSessionAt: daysAgo(20), plannedCompleted: 1, plannedMissed: 9 })).toBe(
                'stale',
            )
        })
    })

    describe('derived figures', () => {
        it('should_divide_adherence_by_what_was_due', async () => {
            const { handler } = setup({ plannedCompleted: 5, plannedMissed: 5 })

            const [entry] = await handler.execute(new GetCoachRosterQuery(COACH))

            expect(entry).toMatchObject({ adherenceRate: 0.5, plannedDue: 10 })
        })

        it('should_report_no_adherence_rather_than_zero_when_nothing_was_programmed', async () => {
            const { handler } = setup({ plannedCompleted: 0, plannedMissed: 0 })

            const [entry] = await handler.execute(new GetCoachRosterQuery(COACH))

            expect(entry!.adherenceRate).toBeNull()
        })

        it('should_count_whole_days_since_the_last_session', async () => {
            const { handler } = setup({ lastSessionAt: daysAgo(3) })

            const [entry] = await handler.execute(new GetCoachRosterQuery(COACH))

            expect(entry!.daysSinceLastSession).toBe(3)
        })
    })
})
