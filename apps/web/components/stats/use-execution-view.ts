import type { AthleteExecution } from '@/lib/graphql/hooks/use-athlete'
import type { TrainingExecutionData } from '@/lib/graphql/hooks/use-workouts'

/**
 * The execution payload, whether it came from the coach's `athleteExecution` or a
 * lifter's own `trainingExecution` — the same GraphQL type behind both.
 */
export type ExecutionData = AthleteExecution | TrainingExecutionData

/**
 * Below these counts a rate is arithmetic, not evidence. 100% adherence over two
 * sessions must not read like 100% over forty, so the view flags it and the UI
 * demotes the number instead of hiding it.
 */
const CONFIDENT_SESSIONS = 3
const CONFIDENT_SETS = 10

/** How far off programmed load still counts as "on plan". */
const ON_PLAN_MARGIN = 0.05

/** How stale the last session is, in words the UI can colour by. */
export type Staleness = 'fresh' | 'slipping' | 'stale' | 'never'

/** Which side of the programmed load they landed on. */
export type ComplianceBand = 'under' | 'onPlan' | 'over'

export interface ExecutionView {
    adherence: { rate: number | null; done: number; missed: number; upcoming: number; due: number; confident: boolean }
    success: { rate: number | null; ok: number; failed: number; pending: number; marked: number; confident: boolean }
    compliance: { rate: number | null; sets: number; band: ComplianceBand | null; confident: boolean }
    staleness: Staleness
}

function staleness(days: number | null): Staleness {
    if (days === null) return 'never'
    if (days <= 3) return 'fresh'
    if (days <= 7) return 'slipping'

    return 'stale'
}

function complianceBand(rate: number | null): ComplianceBand | null {
    if (rate === null) return null
    if (rate > 1 + ON_PLAN_MARGIN) return 'over'
    if (rate < 1 - ON_PLAN_MARGIN) return 'under'

    return 'onPlan'
}

/**
 * Turns the API's raw counters into what the panels actually render: the
 * denominators, the confidence flags and the bands. Kept out of the components
 * so the same rules can't drift between the value, its meter and its label.
 */
export function useExecutionView(execution: ExecutionData | undefined): ExecutionView | null {
    if (!execution) return null

    // Upcoming sessions aren't late yet, so they're not in the denominator —
    // they ride along only as context in the bar.
    const due = execution.plannedCompleted + execution.plannedMissed
    const marked = execution.successSets + execution.failedSets

    return {
        adherence: {
            rate: execution.adherenceRate,
            done: execution.plannedCompleted,
            missed: execution.plannedMissed,
            upcoming: execution.plannedUpcoming,
            due,
            confident: due >= CONFIDENT_SESSIONS,
        },
        success: {
            rate: execution.successRate,
            ok: execution.successSets,
            failed: execution.failedSets,
            pending: execution.pendingSets,
            marked,
            confident: marked >= CONFIDENT_SETS,
        },
        compliance: {
            rate: execution.loadCompliance,
            sets: execution.plannedSets,
            band: complianceBand(execution.loadCompliance),
            confident: execution.plannedSets >= CONFIDENT_SETS,
        },
        staleness: staleness(execution.daysSinceLastSession ?? null),
    }
}
