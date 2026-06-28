'use client'

import { useState } from 'react'

import { track } from '@/lib/analytics/events'
import {
    type ExerciseEntryData,
    type WorkoutSetData,
    useLogSet,
    useRemoveExerciseEntry,
    useRemoveSet,
    useUpdateSet,
} from '@/lib/graphql/hooks/use-workouts'
import { formatWeight, kgTo, type Units } from '@/lib/units'
import { Close, Plus } from '@/components/ui/icons'
import { SetForm, type SetValues } from './set-form'

function intensitySuffix(set: WorkoutSetData): string {
    if (set.rpe !== null) return ` @${set.rpe}`
    if (set.rir !== null) return ` · ${set.rir} RIR`
    return ''
}

function SetRow({
    sessionId,
    entryId,
    set,
    index,
    units,
}: {
    sessionId: string
    entryId: string
    set: WorkoutSetData
    index: number
    units: Units
}) {
    const update = useUpdateSet()
    const remove = useRemoveSet()
    const [editing, setEditing] = useState(false)

    if (editing) {
        return (
            <li className="py-2.5">
                <SetForm
                    units={units}
                    submitLabel={update.isPending ? 'Saving…' : 'Save'}
                    pending={update.isPending}
                    initial={{
                        weight: set.weightKg === null ? null : kgTo(units, set.weightKg),
                        reps: set.reps,
                        rpe: set.rpe,
                        rir: set.rir,
                    }}
                    onCancel={() => setEditing(false)}
                    onSubmit={(v) =>
                        update.mutate(
                            {
                                sessionId,
                                entryId,
                                setId: set.id,
                                weight: v.weight,
                                reps: v.reps,
                                rpe: v.rpe,
                                rir: v.rir,
                                unit: units,
                            },
                            { onSuccess: () => setEditing(false) },
                        )
                    }
                />
            </li>
        )
    }

    const hasPlanned = set.plannedWeightKg !== null || set.plannedReps !== null

    return (
        <li className="flex items-center gap-3 py-2.5 font-mono text-sm tabular-nums">
            <span className="w-5 text-text-faint">{index + 1}</span>
            <div className="min-w-0 flex-1">
                <span className="text-text">
                    {formatWeight(set.weightKg, units)}
                    <span className="text-text-faint"> × {set.reps ?? '—'}</span>
                    <span className="text-text-dim">{intensitySuffix(set)}</span>
                </span>
                {hasPlanned ? (
                    <span className="ml-2 text-xs text-text-faint">
                        plan {formatWeight(set.plannedWeightKg, units)} × {set.plannedReps ?? '—'}
                    </span>
                ) : null}
            </div>
            {set.e1rmKg !== null ? (
                <span className="hidden text-right text-text-dim sm:block">e1RM {formatWeight(set.e1rmKg, units)}</span>
            ) : null}
            <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-full px-2.5 py-1 text-xs text-text-dim transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
            >
                Edit
            </button>
            <button
                type="button"
                aria-label="Remove set"
                onClick={() => remove.mutate({ sessionId, entryId, setId: set.id })}
                disabled={remove.isPending}
                className="grid size-7 place-items-center rounded-full text-text-faint transition-colors duration-300 hover:bg-white/[0.04] hover:text-ember disabled:opacity-50"
            >
                <Close className="size-3.5" />
            </button>
        </li>
    )
}

/** One exercise in a session: its set list + an inline add-set form, plus the
 *  control to remove the whole exercise. */
export function ExerciseEntry({
    sessionId,
    entry,
    exerciseName,
    units,
}: {
    sessionId: string
    entry: ExerciseEntryData
    exerciseName: string
    units: Units
}) {
    const log = useLogSet()
    const removeEntry = useRemoveExerciseEntry()
    const [adding, setAdding] = useState(false)

    function onAddSet(values: SetValues) {
        log.mutate(
            {
                sessionId,
                entryId: entry.id,
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
        <div className="rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(1rem-0.25rem)] bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-h3 tracking-tight">{exerciseName}</h3>
                    <button
                        type="button"
                        onClick={() => removeEntry.mutate({ sessionId, entryId: entry.id })}
                        disabled={removeEntry.isPending}
                        className="rounded-full px-3 py-1 text-xs text-text-dim transition-colors duration-300 hover:bg-white/[0.04] hover:text-ember disabled:opacity-50"
                    >
                        Remove
                    </button>
                </div>
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
                            />
                        ))}
                    </ul>
                ) : (
                    <p className="mt-3 text-sm text-text-faint">No sets yet.</p>
                )}

                <div className="mt-4">
                    {adding ? (
                        <SetForm
                            units={units}
                            submitLabel={log.isPending ? 'Adding…' : 'Add set'}
                            pending={log.isPending}
                            onSubmit={onAddSet}
                            onCancel={() => setAdding(false)}
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={() => setAdding(true)}
                            className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                        >
                            <Plus className="size-4" /> Add set
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
