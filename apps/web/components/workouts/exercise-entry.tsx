'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { track } from '@/lib/analytics/events'
import { cn } from '@/lib/cn'
import {
    type ExerciseEntryData,
    type WorkoutSetData,
    useLogSet,
    useRemoveExerciseEntry,
    useRemoveSet,
    useUpdateSet,
} from '@/lib/graphql/hooks/use-workouts'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { formatWeight, kgTo, type Units } from '@/lib/units'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Check, ChevronDown, Close, Pencil, Plus } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'
import { CompleteSetModal } from './complete-set-modal'
import { ExerciseHistory } from './exercise-history'
import { SetForm, type OutcomeValue, type SetValues } from './set-form'
import { entryProgress } from './session-progress'

function intensitySuffix(set: WorkoutSetData): string {
    if (set.rpe !== null) return ` @${set.rpe}`
    if (set.rir !== null) return ` · ${set.rir} RIR`
    return ''
}

function plannedIntensitySuffix(set: WorkoutSetData): string {
    if (set.plannedRpe !== null) return ` @${set.plannedRpe}`
    if (set.plannedRir !== null) return ` · ${set.plannedRir} RIR`
    return ''
}

/** How the set reads at a glance: green for done, red for failed, plain for pending. */
function outcomeTone(outcome: string | null): string {
    if (outcome === 'success') return 'text-pr'
    if (outcome === 'failed') return 'text-ember'
    return 'text-text'
}

function SetRow({
    sessionId,
    entryId,
    set,
    index,
    units,
    locked,
}: {
    sessionId: string
    entryId: string
    set: WorkoutSetData
    index: number
    units: Units
    /** Completed session in read-only mode: hide every mutating control. */
    locked: boolean
}) {
    const t = useTranslations('workouts')
    const update = useUpdateSet()
    const remove = useRemoveSet()
    const [editing, setEditing] = useState(false)
    const [marking, setMarking] = useState(false)

    // Re-locking mid-edit closes the form rather than leaving it hanging.
    if (editing && !locked) {
        return (
            <li className="py-2.5">
                <SetForm
                    analyticsId="set-update"
                    units={units}
                    submitLabel={update.isPending ? t('saving') : t('save')}
                    pending={update.isPending}
                    showOutcome
                    initial={{
                        plannedWeight: set.plannedWeightKg === null ? null : kgTo(units, set.plannedWeightKg),
                        plannedReps: set.plannedReps,
                        plannedRpe: set.plannedRpe,
                        plannedRir: set.plannedRir,
                        weight: set.weightKg === null ? null : kgTo(units, set.weightKg),
                        reps: set.reps,
                        rpe: set.rpe,
                        rir: set.rir,
                        outcome: (set.outcome ?? 'pending') as OutcomeValue,
                    }}
                    onCancel={() => setEditing(false)}
                    onSubmit={(v) =>
                        update.mutate(
                            {
                                sessionId,
                                entryId,
                                setId: set.id,
                                plannedWeight: v.plannedWeight,
                                plannedReps: v.plannedReps,
                                plannedRpe: v.plannedRpe,
                                plannedRir: v.plannedRir,
                                weight: v.weight,
                                reps: v.reps,
                                rpe: v.rpe,
                                rir: v.rir,
                                // `pending` is the API's null: the edit is where a
                                // set goes back to unmarked.
                                outcome: v.outcome === 'pending' ? null : v.outcome,
                                unit: units,
                            },
                            { onSuccess: () => setEditing(false) },
                        )
                    }
                />
            </li>
        )
    }

    const hasPlanned =
        set.plannedWeightKg !== null || set.plannedReps !== null || set.plannedRpe !== null || set.plannedRir !== null
    const done = set.outcome !== null

    return (
        <li className="flex items-center gap-3 py-2.5 font-mono text-sm tabular-nums">
            <span className="w-5 self-start pt-0.5 text-text-faint">{index + 1}</span>
            {/* Done on top, planned under it — never the same line: at a glance the
                question is what happened, and the plan is what it's measured against. */}
            <div className="min-w-0 flex-1 space-y-0.5">
                <div className={outcomeTone(set.outcome)}>
                    {formatWeight(set.weightKg, units)}
                    <span className={done ? 'opacity-70' : 'text-text-faint'}> × {set.reps ?? '—'}</span>
                    <span className={done ? 'opacity-70' : 'text-text-dim'}>{intensitySuffix(set)}</span>
                </div>
                {hasPlanned ? (
                    <div className="text-xs text-text-faint">
                        <span className="mr-1.5 text-[10px] uppercase tracking-widest">{t('planPrefix')}</span>
                        {formatWeight(set.plannedWeightKg, units)} × {set.plannedReps ?? '—'}
                        {plannedIntensitySuffix(set)}
                    </div>
                ) : null}
            </div>
            {set.e1rmKg !== null ? (
                <span className="hidden self-start text-right text-text-dim sm:block">
                    e1RM {formatWeight(set.e1rmKg, units)}
                </span>
            ) : null}

            {locked || done ? null : (
                <TrackedButton
                    analyticsId="set-complete-open"
                    type="button"
                    onClick={() => setMarking(true)}
                    className="inline-flex items-center gap-1 self-start rounded-full px-2.5 py-1 text-xs text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-pr/10 hover:text-pr"
                >
                    <Check className="size-3" /> {t('markDone')}
                </TrackedButton>
            )}

            {/* A pencil on phones, the word from sm up: the row already carries two
                stacked lines and up to three controls, and "edit" is the one whose
                icon needs no explaining. `aria-label` keeps the name either way. */}
            {locked ? null : (
                <>
                    <TrackedButton
                        analyticsId="set-edit"
                        type="button"
                        aria-label={t('edit')}
                        onClick={() => setEditing(true)}
                        className="grid size-7 shrink-0 self-start place-items-center rounded-full text-text-dim transition-colors duration-300 hover:bg-white/[0.04] hover:text-text sm:size-auto sm:px-2.5 sm:py-1"
                    >
                        <Pencil className="size-3.5 sm:hidden" />
                        <span className="hidden text-xs sm:inline">{t('edit')}</span>
                    </TrackedButton>
                    <TrackedButton
                        analyticsId="set-remove"
                        type="button"
                        aria-label={t('removeSet')}
                        onClick={() => remove.mutate({ sessionId, entryId, setId: set.id })}
                        disabled={remove.isPending}
                        className="grid size-7 shrink-0 self-start place-items-center rounded-full text-text-faint transition-colors duration-300 hover:bg-white/[0.04] hover:text-ember disabled:opacity-50"
                    >
                        <Close className="size-3.5" />
                    </TrackedButton>
                </>
            )}

            {/* Mounted only while open so the form always seeds from the set as it
                is right now, rather than from whatever it was on first render. */}
            {marking ? (
                <CompleteSetModal
                    open
                    onClose={() => setMarking(false)}
                    sessionId={sessionId}
                    entryId={entryId}
                    set={set}
                    index={index}
                    units={units}
                />
            ) : null}
        </li>
    )
}

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
    const [adding, setAdding] = useState(false)
    const [collapsed, setCollapsed] = useState(false)
    const [confirmingRemove, setConfirmingRemove] = useState(false)
    const [removeError, setRemoveError] = useState<string | null>(null)
    const progress = entryProgress(entry)

    // Removing the exercise takes its sets down with it (the API cascades), so the
    // dialog says how many are about to go — that count is the actual stake.
    async function onRemoveEntry() {
        setRemoveError(null)
        try {
            await removeEntry.mutateAsync({ sessionId, entryId: entry.id })
            setConfirmingRemove(false)
        } catch (error) {
            setRemoveError(errorMessage(error))
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
                        <h3 className="truncate font-display text-h3 tracking-tight">{exerciseName}</h3>
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
                            onClick={() => setConfirmingRemove(true)}
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
                    open={confirmingRemove}
                    onClose={() => {
                        setRemoveError(null)
                        setConfirmingRemove(false)
                    }}
                    onConfirm={onRemoveEntry}
                    title={t('entryRemoveTitle', { name: exerciseName })}
                    description={t('entryRemoveBody', { sets: entry.sets.length })}
                    confirmLabel={t('entryRemove')}
                    cancelLabel={t('cancel')}
                    destructive
                    pending={removeEntry.isPending}
                    error={removeError}
                />
            </div>
        </div>
    )
}
