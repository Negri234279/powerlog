'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import type { SetField } from '@/lib/workouts/planned-validation'
import type { Units } from '@/lib/units'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/field'
import { Plus, Trash } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'
import type { DraftExercise, DraftSet } from './template-draft'
import { SetRow } from './template-set-row'

/** One exercise in the template editor: its notes, the programmed-set grid, an
 *  add-set control, and the confirm-guarded remove for the whole exercise. */
export function ExerciseCard({
    exercise,
    name,
    units,
    errors,
    onRemove,
    onNotes,
    onAddSet,
    onPatchSet,
    onRemoveSet,
    onDuplicateSet,
    onValidateSet,
}: {
    exercise: DraftExercise
    name: string
    units: Units
    errors: Record<string, string>
    onRemove: () => void
    onNotes: (value: string) => void
    onAddSet: () => void
    onPatchSet: (setKey: string, patch: Partial<DraftSet>) => void
    onRemoveSet: (setKey: string) => void
    onDuplicateSet: (setKey: string) => void
    onValidateSet: (set: DraftSet, field: SetField) => void
}) {
    const t = useTranslations('templates')
    const tw = useTranslations('workouts')
    const [confirmingRemove, setConfirmingRemove] = useState(false)

    return (
        <div className="rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(1rem-0.25rem)] bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg tracking-tight">{name}</h3>
                    <TrackedButton
                        analyticsId="template-remove-exercise"
                        type="button"
                        onClick={() => setConfirmingRemove(true)}
                        aria-label={t('removeExercise', { name })}
                        className="grid size-8 place-items-center rounded-full text-text-faint transition-colors duration-300 hover:bg-ember/10 hover:text-ember"
                    >
                        <Trash className="size-4" />
                    </TrackedButton>
                </div>

                <ConfirmModal
                    analyticsId="template-remove-exercise"
                    open={confirmingRemove}
                    onClose={() => setConfirmingRemove(false)}
                    onConfirm={onRemove}
                    title={tw('entryRemoveTitle', { name })}
                    description={tw('entryRemoveBody', { sets: exercise.sets.length })}
                    confirmLabel={tw('entryRemove')}
                    cancelLabel={tw('cancel')}
                    destructive
                />

                <Input
                    value={exercise.notes}
                    onChange={(e) => onNotes(e.target.value)}
                    placeholder={t('exerciseNotesPlaceholder')}
                    className="mt-3"
                />

                <div className="mt-4 space-y-2">
                    <div className="grid grid-cols-[1.5rem_1fr_1fr_1.3fr_2rem] items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-text-faint">
                        <span className="text-right">#</span>
                        <span>{tw('weightLabel', { units })}</span>
                        <span>{tw('reps')}</span>
                        <span>{tw('intensity')}</span>
                        <span />
                    </div>
                    {exercise.sets.map((set, index) => (
                        <SetRow
                            key={set.key}
                            set={set}
                            index={index + 1}
                            errors={errors}
                            onPatch={(patch) => onPatchSet(set.key, patch)}
                            onRemove={() => onRemoveSet(set.key)}
                            onDuplicate={() => onDuplicateSet(set.key)}
                            onBlurField={(field) => onValidateSet(set, field)}
                        />
                    ))}
                </div>

                <TrackedButton
                    analyticsId="template-add-set"
                    type="button"
                    onClick={onAddSet}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                >
                    <Plus className="size-3.5" /> {tw('addSet')}
                </TrackedButton>
            </div>
        </div>
    )
}
