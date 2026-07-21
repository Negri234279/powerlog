import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { Clock } from '../../ports/clock.port'
import { TrainingDashboardReadModel } from '../../ports/training-dashboard.read-model'
import { GetAthleteExecutionQuery } from './get-athlete-execution.query'

const DAY_MS = 86_400_000
const WEEK_MS = 7 * DAY_MS

/**
 * Execution KPIs for a coach's athlete. Every rate is nullable and `null` means
 * "no basis to answer", never zero: an athlete you have programmed nothing for
 * has no adherence, which is a different statement from 0% adherence, and the
 * UI has to be able to tell them apart.
 */
export interface AthleteExecutionView {
    /** Completed ÷ (completed + missed) of what this coach programmed. */
    adherenceRate: number | null
    plannedCompleted: number
    plannedMissed: number
    plannedUpcoming: number

    /** Successful ÷ marked sets, over all the athlete's training in range. */
    successRate: number | null
    successSets: number
    failedSets: number
    pendingSets: number

    /** Executed ÷ programmed load. Above 1 = trained heavier than written. */
    loadCompliance: number | null
    /** Sets that ratio is built from, so the UI can show its denominator. */
    plannedSets: number

    /** Mean completed sessions per week across the range. */
    sessionsPerWeek: number | null
    /** All-time, ignores the range. */
    lastSessionAt: Date | null
    daysSinceLastSession: number | null

    /** Signed change vs the preceding window of equal length (0.12 = +12%). */
    volumeChange: number | null
    sessionsChange: number | null
}

/** Ratio, or null when the denominator can't support one. */
function ratio(numerator: number, denominator: number): number | null {
    if (denominator <= 0) return null

    return Math.round((numerator / denominator) * 10_000) / 10_000
}

/** Signed relative change, or null when there's no baseline to change from. */
function change(current: number, previous: number): number | null {
    if (previous <= 0) return null

    return Math.round(((current - previous) / previous) * 10_000) / 10_000
}

@QueryHandler(GetAthleteExecutionQuery)
export class GetAthleteExecutionHandler implements IQueryHandler<GetAthleteExecutionQuery, AthleteExecutionView> {
    constructor(
        private readonly dashboard: TrainingDashboardReadModel,
        private readonly clock: Clock,
    ) {}

    async execute(query: GetAthleteExecutionQuery): Promise<AthleteExecutionView> {
        const now = this.clock.now()
        const from = query.from ? new Date(query.from) : undefined
        const to = query.to ? new Date(query.to) : undefined

        // The preceding window mirrors the selected one exactly, so the comparison
        // is like-for-like. Without a lower bound there is no window to mirror.
        const rangeMs = from ? (to ?? now).getTime() - from.getTime() : 0
        const previousFrom = from && rangeMs > 0 ? new Date(from.getTime() - rangeMs) : undefined

        const row = await this.dashboard.execution({
            userId: query.athleteId,
            plannedByUserId: query.coachId,
            from,
            to,
            previousFrom,
            now,
        })

        const markedSets = row.successSets + row.failedSets
        const programmed = row.plannedCompleted + row.plannedMissed

        return {
            adherenceRate: ratio(row.plannedCompleted, programmed),
            plannedCompleted: row.plannedCompleted,
            plannedMissed: row.plannedMissed,
            plannedUpcoming: row.plannedUpcoming,

            successRate: ratio(row.successSets, markedSets),
            successSets: row.successSets,
            failedSets: row.failedSets,
            pendingSets: row.pendingSets,

            loadCompliance: ratio(row.actualLoadKg, row.plannedLoadKg),
            plannedSets: row.plannedSets,

            sessionsPerWeek: this.sessionsPerWeek(row, from, to, now),
            lastSessionAt: row.lastSessionAt,
            daysSinceLastSession:
                row.lastSessionAt === null
                    ? null
                    : Math.max(0, Math.floor((now.getTime() - row.lastSessionAt.getTime()) / DAY_MS)),

            volumeChange: change(row.volumeKg, row.previousVolumeKg),
            sessionsChange: change(row.completedSessions, row.previousCompletedSessions),
        }
    }

    /**
     * Averaged over the selected window, or — when "all time" is selected — over
     * the athlete's whole training history. Clamped to at least one week: a
     * three-day window with two sessions is "2 per week", not "4.7".
     */
    private sessionsPerWeek(
        row: { completedSessions: number; firstSessionAt: Date | null },
        from: Date | undefined,
        to: Date | undefined,
        now: Date,
    ): number | null {
        const start = from ?? row.firstSessionAt
        if (start === null || start === undefined) return null

        const spanMs = (to ?? now).getTime() - start.getTime()
        const weeks = Math.max(1, spanMs / WEEK_MS)

        return Math.round((row.completedSessions / weeks) * 10) / 10
    }
}
