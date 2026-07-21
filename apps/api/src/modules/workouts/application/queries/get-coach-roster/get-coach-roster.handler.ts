import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { CoachLinks } from '../../../../../shared/contracts/coach-links'
import { Clock } from '../../ports/clock.port'
import { CoachRosterReadModel } from '../../ports/coach-roster.read-model'
import { GetCoachRosterQuery } from './get-coach-roster.query'

const DAY_MS = 86_400_000

/** Beyond this many days without training, an athlete needs chasing. */
const STALE_DAYS = 7

/** Below this adherence, with at least this many sessions due, so does their plan. */
const POOR_ADHERENCE = 0.7
const CONFIDENT_SESSIONS = 3

/**
 * Why a row is flagged, or `none`. Ranked, and only ever one per athlete: a
 * stacked set of warnings turns the roster into a wall of colour, which is how a
 * marker stops being read at all.
 */
export type RosterAttention = 'none' | 'stale' | 'neverTrained' | 'lowAdherence'

export interface CoachRosterEntry {
    athleteId: string
    /** When the coaching relationship started — what "hasn't trained yet" is judged against. */
    coachedSince: Date
    lastSessionAt: Date | null
    daysSinceLastSession: number | null
    nextSessionAt: Date | null
    /** Completed ÷ due of this coach's programming; null when nothing was due. */
    adherenceRate: number | null
    plannedCompleted: number
    plannedMissed: number
    /** Sessions due (completed + missed) — the adherence denominator. */
    plannedDue: number
    completedSessions: number
    /** Null rather than 0 when nothing was trained: zero volume from zero sessions
     *  is an absence, not a measurement. */
    volumeKg: number | null
    volumeChange: number | null
    attention: RosterAttention
}

@QueryHandler(GetCoachRosterQuery)
export class GetCoachRosterHandler implements IQueryHandler<GetCoachRosterQuery, CoachRosterEntry[]> {
    constructor(
        private readonly roster: CoachRosterReadModel,
        private readonly links: CoachLinks,
        private readonly clock: Clock,
    ) {}

    async execute(query: GetCoachRosterQuery): Promise<CoachRosterEntry[]> {
        const now = this.clock.now()
        const linked = await this.links.athletesOf(query.coachId)
        const since = new Map(linked.map((link) => [link.athleteId, link.since]))

        const rows = await this.roster.roster({
            athleteIds: linked.map((link) => link.athleteId),
            coachId: query.coachId,
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
            now,
        })

        return rows.map((row) => {
            const coachedSince = since.get(row.athleteId) ?? now
            const plannedDue = row.plannedCompleted + row.plannedMissed
            const adherenceRate =
                plannedDue === 0 ? null : Math.round((row.plannedCompleted / plannedDue) * 10_000) / 10_000
            const daysSinceLastSession =
                row.lastSessionAt === null
                    ? null
                    : Math.max(0, Math.floor((now.getTime() - row.lastSessionAt.getTime()) / DAY_MS))

            return {
                athleteId: row.athleteId,
                coachedSince,
                lastSessionAt: row.lastSessionAt,
                daysSinceLastSession,
                nextSessionAt: row.nextSessionAt,
                adherenceRate,
                plannedCompleted: row.plannedCompleted,
                plannedMissed: row.plannedMissed,
                plannedDue,
                completedSessions: row.completedSessions,
                volumeKg: row.completedSessions === 0 ? null : row.volumeKg,
                volumeChange:
                    row.previousVolumeKg <= 0
                        ? null
                        : Math.round(((row.volumeKg - row.previousVolumeKg) / row.previousVolumeKg) * 10_000) / 10_000,
                attention: attentionOf({
                    daysSinceLastSession,
                    daysCoached: Math.floor((now.getTime() - coachedSince.getTime()) / DAY_MS),
                    adherenceRate,
                    plannedMissed: row.plannedMissed,
                    plannedDue,
                }),
            }
        })
    }
}

/**
 * First match wins. The exclusions matter as much as the rules:
 *
 * - 4–7 days idle is **not** flagged. Someone training three times a week is
 *   legitimately four days out on a Thursday, and colouring that paints most of
 *   a healthy roster orange on any given day.
 * - Poor adherence over fewer than three due sessions is **not** flagged. 0%
 *   across two sessions is arithmetic, not evidence — the same gate the athlete
 *   detail page applies before it trusts a rate.
 * - A never-trained athlete is flagged only once they are past the stale window,
 *   so someone who joined this morning isn't a problem by lunchtime.
 */
function attentionOf(input: {
    daysSinceLastSession: number | null
    daysCoached: number
    adherenceRate: number | null
    plannedMissed: number
    plannedDue: number
}): RosterAttention {
    // Never trained: only a problem once they've had time to. Someone linked this
    // morning has trained exactly as much as someone who quit a month ago, and
    // flagging both teaches the coach that the marker fires for non-problems.
    if (input.daysSinceLastSession === null) {
        return input.daysCoached > STALE_DAYS ? 'neverTrained' : 'none'
    }

    if (input.daysSinceLastSession > STALE_DAYS) return 'stale'

    if (
        input.plannedMissed >= 1 &&
        input.plannedDue >= CONFIDENT_SESSIONS &&
        input.adherenceRate !== null &&
        input.adherenceRate < POOR_ADHERENCE
    ) {
        return 'lowAdherence'
    }

    return 'none'
}
