'use client'

import { useTranslations } from 'next-intl'

import type { ExerciseEntryData, WorkoutSessionData } from '@/lib/graphql/hooks/use-workouts'

export interface Progress {
    completed: number
    total: number
    /** Every set accounted for — and at least one to account for. */
    done: boolean
}

function progressOf(sets: readonly { outcome: string | null }[]): Progress {
    // Success or failed both count: the question is whether the athlete has been
    // through the set, not whether it went well.
    const completed = sets.filter((set) => set.outcome !== null).length
    return { completed, total: sets.length, done: sets.length > 0 && completed === sets.length }
}

/** How far through one exercise the athlete is. */
export function entryProgress(entry: ExerciseEntryData): Progress {
    return progressOf(entry.sets)
}

/** How far through the whole session, counted in sets. */
export function sessionProgress(session: WorkoutSessionData): Progress {
    return progressOf(session.entries.flatMap((entry) => entry.sets))
}

/**
 * The session's progress bar: sets marked done over sets programmed. Counted in
 * sets rather than exercises so it actually moves during a session — an
 * exercise-level bar sits at zero through the first five sets of a five-set lift.
 */
export function SessionProgress({ session }: { session: WorkoutSessionData }) {
    const t = useTranslations('workouts')
    const { completed, total, done } = sessionProgress(session)

    if (total === 0) return null

    const percent = Math.round((completed / total) * 100)

    return (
        <div>
            <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-eyebrow uppercase tracking-widest text-text-faint">
                    {t('sessionProgress')}
                </span>
                <span className="font-mono text-sm tabular-nums text-text-dim">
                    {t('setsDone', { completed, total })}
                </span>
            </div>
            <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t('sessionProgress')}
            >
                <div
                    className={`h-full rounded-full transition-[width] duration-500 ease-out ${done ? 'bg-pr' : 'bg-amber'}`}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    )
}
