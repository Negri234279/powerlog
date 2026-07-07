'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import { type ExerciseSessionHistorySet, useExerciseSessionHistory } from '@/lib/graphql/hooks/use-workouts'
import { kgTo, type Units } from '@/lib/units'
import { ChevronDown } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'

const DATE_FMT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }

/** Compact weight in the user's units, trailing zeros trimmed: 102.5 → "102.5kg". */
function compactWeight(kg: number, units: Units): string {
    const value = kgTo(units, kg)
    return `${Number(value.toFixed(1))}${units}`
}

/** "102.5kg × 5 @8" / "90kg × 8 · RIR 2" — reps then optional intensity. */
function formatSet(set: ExerciseSessionHistorySet, units: Units): string {
    const base = `${compactWeight(set.weightKg, units)} × ${set.reps}`
    if (set.rpe !== null) return `${base} @${set.rpe}`
    if (set.rir !== null) return `${base} · RIR ${set.rir}`
    return base
}

/** Whether the set carried a programmed target (weight and/or reps). */
function hasPlanned(set: ExerciseSessionHistorySet): boolean {
    return set.plannedWeightKg !== null || set.plannedReps !== null
}

/** "100kg × 5" from the programmed target; a missing side renders as "—". */
function formatPlanned(set: ExerciseSessionHistorySet, units: Units): string {
    const weight = set.plannedWeightKg !== null ? compactWeight(set.plannedWeightKg, units) : '—'
    const reps = set.plannedReps !== null ? set.plannedReps : '—'
    return `${weight} × ${reps}`
}

/**
 * Collapsible "previous marks" panel for one exercise inside a session. Lazily
 * fetches the caller's recent completed sessions of this exercise (excluding the
 * one being viewed) and lists each session's performed sets, so the athlete can
 * see what they hit last time. Uses the accordion transition (grid-rows 0fr↔1fr).
 */
export function ExerciseHistory({
    exerciseId,
    sessionId,
    units,
}: {
    exerciseId: string
    sessionId: string
    units: Units
}) {
    const t = useTranslations('workouts')
    const locale = useLocale()
    const [open, setOpen] = useState(false)
    const { data, isLoading, isError } = useExerciseSessionHistory(exerciseId, sessionId, { enabled: open })

    const count = data?.length ?? 0

    return (
        <div className="t-acc mt-4 border-t border-hairline pt-3" data-open={open}>
            <TrackedButton
                analyticsId="exercise-history-toggle"
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-2 text-left font-mono text-eyebrow uppercase tracking-widest text-text-faint transition-colors duration-300 hover:text-text-dim"
            >
                <ChevronDown className="t-acc-chevron size-3.5" />
                {t('previousSessions')}
                {open && count > 0 ? <span className="text-text-dim">· {count}</span> : null}
            </TrackedButton>

            <div className="t-acc-panel">
                <div className="t-acc-panel-inner">
                    <div className="pt-3">
                        {isLoading ? (
                            <p className="text-sm text-text-faint">{t('loading')}</p>
                        ) : isError ? (
                            <p className="text-sm text-text-faint">{t('historyLoadError')}</p>
                        ) : count === 0 ? (
                            <p className="text-sm text-text-faint">{t('noPrevious')}</p>
                        ) : (
                            <ul className="space-y-3">
                                {data!.map((entry) => (
                                    <li key={entry.sessionId}>
                                        <span className="font-mono text-xs uppercase tracking-wider text-text-faint">
                                            {new Date(entry.performedAt).toLocaleDateString(locale, DATE_FMT)}
                                        </span>
                                        {/* One set per line so each mark reads clearly (with its target). */}
                                        <ul className="mt-1.5 space-y-1">
                                            {entry.sets.map((set, i) => (
                                                <li
                                                    key={i}
                                                    className="flex items-baseline gap-3 font-mono text-sm tabular-nums"
                                                >
                                                    <span className="w-4 shrink-0 text-right text-xs text-text-faint">
                                                        {i + 1}
                                                    </span>
                                                    <span className="text-text-dim">{formatSet(set, units)}</span>
                                                    {hasPlanned(set) ? (
                                                        <span className="text-xs text-text-faint">
                                                            {t('planPrefix')} {formatPlanned(set, units)}
                                                        </span>
                                                    ) : null}
                                                </li>
                                            ))}
                                        </ul>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
