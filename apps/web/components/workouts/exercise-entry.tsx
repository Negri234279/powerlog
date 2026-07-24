'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { track } from '@/lib/analytics/events'
import { cn } from '@/lib/cn'
import { type ExerciseEntryData, useLogSet, useRemoveExerciseEntry } from '@/lib/graphql/hooks/use-workouts'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import type { Units } from '@/lib/units'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { ChevronDown, Plus } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'
import { ExerciseHistory } from './exercise-history'
import { SetForm, type SetValues } from './set-form'
import { SetRow } from './set-row'
import { entryProgress } from './session-progress'

/** One exercise in a session: its set list + an inline add-set form, plus the
 *  control to remove the whole exercise. The card's ring tracks whether every
 *  set in it has been marked done. */
export function ExerciseEntry({
    sessionId,
    entry,
    exerciseName,
    units,
    athleteId,
    locked,
}: {
    sessionId: string
    entry: ExerciseEntryData
    exerciseName: string
    units: Units
    /** Set only when a coach is editing an athlete's session — the previous marks
     *  shown must then be the athlete's, not the coach's. */
    athleteId?: string
    /** Completed session in read-only mode: hide the add-set and remove controls. */
    locked: boolean
}) {
    const t = useTranslations('workouts')
    const errorMessage = useErrorMessage()
    const log = useLogSet()
    const removeEntry = useRemoveExerciseEntry()
    const [collapsed, setCollapsed] = useState(false)
    const [adding, setAdding] = useState(false)
    // The remove dialog's state travels together: the error only exists while the
    // dialog is up, and both reset the moment it closes.
    const [removal, setRemoval] = useState<{ confirming: boolean; error: string | null }>({
        confirming: false,
        error: null,
    })
    const progress = entryProgress(entry)

    // Removing the exercise takes its sets down with it (the API cascades), so the
    // dialog says how many are about to go — that count is the actual stake.
    async function onRemoveEntry() {
        setRemoval({ confirming: true, error: null })
        try {
            await removeEntry.mutateAsync({ sessionId, entryId: entry.id })
            setRemoval({ confirming: false, error: null })
        } catch (error) {
            setRemoval({ confirming: true, error: errorMessage(error) })
        }
    }

    // A new set is always pending — `logSet` has no outcome to send: you mark it
    // done once you've done it.
    function onAddSet(values: SetValues) {
        log.mutate(
            {
                sessionId,
                entryId: entry.id,
                plannedWeight: values.plannedWeight,
                plannedReps: values.plannedReps,
                plannedRpe: values.plannedRpe,
                plannedRir: values.plannedRir,
                weight: values.weight,
                reps: values.reps,
                rpe: values.rpe,
                rir: values.rir,
                unit: units,
            },
            {
                onSuccess: () => {
                    track('set_logged', {})
                    setAdding(false)
                },
            },
        )
    }

    return (
        <div
            className={cn(
                'rounded-2xl bg-shell p-1.5 ring-1 transition-colors duration-500',
                progress.done ? 'ring-pr/40' : progress.total > 0 ? 'ring-amber/40' : 'ring-hairline',
            )}
        >
            <div className="inset-hi rounded-[calc(1rem-0.25rem)] bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                    {/* The whole title is the toggle: a long session is mostly
                        scrolling, and the counter stays readable while collapsed. */}
                    <TrackedButton
                        analyticsId="exercise-entry-toggle"
                        type="button"
                        aria-expanded={!collapsed}
                        onClick={() => setCollapsed((value) => !value)}
                        className="flex min-w-0 items-center gap-2.5 text-left"
                    >
                        <ChevronDown
                            className={cn(
                                'size-4 shrink-0 text-text-faint transition-transform duration-300',
                                collapsed && '-rotate-90',
                            )}
                        />
                        <h2 className="truncate font-display text-h3 tracking-tight">{exerciseName}</h2>
                        {progress.total > 0 ? (
                            <span
                                className={cn(
                                    'shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] tabular-nums',
                                    progress.done ? 'bg-pr/10 text-pr' : 'bg-amber/10 text-amber',
                                )}
                            >
                                {progress.completed}/{progress.total}
                            </span>
                        ) : null}
                    </TrackedButton>
                    {locked ? null : (
                        <TrackedButton
                            analyticsId="exercise-entry-remove-open"
                            type="button"
                            onClick={() => setRemoval({ confirming: true, error: null })}
                            className="shrink-0 rounded-full px-3 py-1 text-xs text-text-dim transition-colors duration-300 hover:bg-white/[0.04] hover:text-ember"
                        >
                            {t('entryRemove')}
                        </TrackedButton>
                    )}
                </div>

                {collapsed ? null : (
                    <>
                        {entry.notes ? <p className="mt-1 text-sm text-text-dim">{entry.notes}</p> : null}

                        {entry.sets.length > 0 ? (
                            <ul className="mt-3 divide-y divide-hairline">
                                {entry.sets.map((set, i) => (
                                    <SetRow
                                        key={set.id}
                                        sessionId={sessionId}
                                        entryId={entry.id}
                                        set={set}
                                        index={i}
                                        units={units}
                                        locked={locked}
                                    />
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-3 text-sm text-text-faint">{t('noSetsYet')}</p>
                        )}

                        {locked ? null : (
                            <div className="mt-4">
                                {adding ? (
                                    <SetForm
                                        analyticsId="set-log"
                                        units={units}
                                        submitLabel={log.isPending ? t('adding') : t('addSet')}
                                        pending={log.isPending}
                                        onSubmit={onAddSet}
                                        onCancel={() => setAdding(false)}
                                    />
                                ) : (
                                    <TrackedButton
                                        analyticsId="set-add-open"
                                        type="button"
                                        onClick={() => setAdding(true)}
                                        className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                                    >
                                        <Plus className="size-4" /> {t('addSet')}
                                    </TrackedButton>
                                )}
                            </div>
                        )}

                        <ExerciseHistory
                            exerciseId={entry.exerciseId}
                            sessionId={sessionId}
                            units={units}
                            athleteId={athleteId}
                        />
                    </>
                )}

                {/* Outside the collapse: a dialog the user opened must not vanish
                    because the card it lives in got folded. */}
                <ConfirmModal
                    analyticsId="exercise-entry-remove"
                    open={removal.confirming}
                    onClose={() => setRemoval({ confirming: false, error: null })}
                    onConfirm={onRemoveEntry}
                    title={t('entryRemoveTitle', { name: exerciseName })}
                    description={t('entryRemoveBody', { sets: entry.sets.length })}
                    confirmLabel={t('entryRemove')}
                    cancelLabel={t('cancel')}
                    destructive
                    pending={removeEntry.isPending}
                    error={removal.error}
                />
            </div>
        </div>
    )
}
