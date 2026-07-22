'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { cn } from '@/lib/cn'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import { useExercises } from '@/lib/graphql/hooks/use-workouts'
import {
    type WorkoutTemplateData,
    useCreateWorkoutTemplate,
    useUpdateWorkoutTemplate,
    useWorkoutTemplate,
} from '@/lib/graphql/hooks/use-workout-templates'
import { formatRange, formatWeightRange } from '@/lib/range'
import { type Units, unitsOf } from '@/lib/units'
import { Field, Input } from '@/components/ui/field'
import { UpgradeGate, isPlanRefusal } from '@/components/billing/upgrade-gate'
import { FormError } from '@/components/ui/form-error'
import { Close, Plus, Trash } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'
import { ExercisePicker } from './exercise-picker'

type IntensityKind = 'none' | 'rpe' | 'rir'

interface DraftSet {
    key: string
    weight: string
    reps: string
    intensityKind: IntensityKind
    intensity: string
    notes: string
}

interface DraftExercise {
    key: string
    exerciseId: string
    notes: string
    sets: DraftSet[]
}

function newKey(): string {
    return crypto.randomUUID()
}

function emptySet(): DraftSet {
    return { key: newKey(), weight: '', reps: '', intensityKind: 'none', intensity: '', notes: '' }
}

/** Build the editable draft from a loaded template (kg → display units), each
 *  planned target seeded as its range text (`5` or `5-8`). */
function draftFromTemplate(template: WorkoutTemplateData, units: Units): DraftExercise[] {
    return template.exercises.map((exercise) => ({
        key: newKey(),
        exerciseId: exercise.exerciseId,
        notes: exercise.notes ?? '',
        sets: exercise.sets.map((set) => ({
            key: newKey(),
            weight: formatWeightRange(set.plannedWeightKg, units),
            reps: formatRange(set.plannedReps),
            intensityKind: set.rpe ? 'rpe' : set.rir ? 'rir' : 'none',
            intensity: formatRange(set.rpe ?? set.rir),
            notes: set.notes ?? '',
        })),
    }))
}

/** Trim the field to text, or null when blank — the API parses `5` / `5-8`. */
function textOrNull(value: string): string | null {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
}

/**
 * Create/edit a workout template as a whole tree: name + notes + exercises, each
 * with programmed sets (weight/reps/RPE-or-RIR/notes). Weights are entered in the
 * user's display unit and sent with `unit` so the API stores canonical kg.
 */
export function TemplateBuilder({
    templateId,
    onClose,
    onSaved,
}: {
    templateId: string | null
    onClose: () => void
    onSaved: () => void
}) {
    const { data: me } = useMe()
    const units = unitsOf(me?.units)
    const { data: exercises } = useExercises()
    const editing = templateId !== null
    const { data: loaded, isLoading: loadingTemplate } = useWorkoutTemplate(templateId)

    const create = useCreateWorkoutTemplate()
    const update = useUpdateWorkoutTemplate()
    const pending = create.isPending || update.isPending

    const t = useTranslations('templates')
    const tw = useTranslations('workouts')
    const errorMessage = useErrorMessage()
    const [name, setName] = useState('')
    const [notes, setNotes] = useState('')
    const [draft, setDraft] = useState<DraftExercise[]>([])
    const [error, setError] = useState<string | null>(null)
    // Kept alongside the message so a plan refusal can render an upgrade CTA instead.
    const [rawError, setRawError] = useState<unknown>(null)
    const [picking, setPicking] = useState(false)

    // Seed the form from the loaded template (once it arrives, for edit mode).
    const [seeded, setSeeded] = useState(false)
    useEffect(() => {
        if (editing && loaded && !seeded) {
            setName(loaded.name)
            setNotes(loaded.notes ?? '')
            setDraft(draftFromTemplate(loaded, units))
            setSeeded(true)
        }
    }, [editing, loaded, seeded, units])

    const nameById = useMemo(() => {
        const map = new Map<string, string>()
        for (const exercise of exercises ?? []) map.set(exercise.id, exercise.name)
        return map
    }, [exercises])

    function addExercise(exerciseId: string) {
        setDraft((d) => [...d, { key: newKey(), exerciseId, notes: '', sets: [emptySet()] }])
        setPicking(false)
    }

    function removeExercise(key: string) {
        setDraft((d) => d.filter((e) => e.key !== key))
    }

    function patchExercise(key: string, patch: Partial<DraftExercise>) {
        setDraft((d) => d.map((e) => (e.key === key ? { ...e, ...patch } : e)))
    }

    function addSet(exerciseKey: string) {
        setDraft((d) =>
            d.map((e) => {
                if (e.key !== exerciseKey) return e
                // Clone the last set's targets for speed; fresh if there are none.
                const last = e.sets[e.sets.length - 1]
                const next: DraftSet = last ? { ...last, key: newKey() } : emptySet()
                return { ...e, sets: [...e.sets, next] }
            }),
        )
    }

    function patchSet(exerciseKey: string, setKey: string, patch: Partial<DraftSet>) {
        setDraft((d) =>
            d.map((e) =>
                e.key === exerciseKey
                    ? { ...e, sets: e.sets.map((s) => (s.key === setKey ? { ...s, ...patch } : s)) }
                    : e,
            ),
        )
    }

    function removeSet(exerciseKey: string, setKey: string) {
        setDraft((d) =>
            d.map((e) => (e.key === exerciseKey ? { ...e, sets: e.sets.filter((s) => s.key !== setKey) } : e)),
        )
    }

    async function onSave() {
        setError(null)
        setRawError(null)
        if (name.trim() === '') {
            setError(t('nameRequired'))
            return
        }

        const input = {
            name: name.trim(),
            notes: notes.trim() === '' ? null : notes.trim(),
            exercises: draft.map((exercise) => ({
                exerciseId: exercise.exerciseId,
                notes: exercise.notes.trim() === '' ? null : exercise.notes.trim(),
                sets: exercise.sets.map((set) => ({
                    unit: units,
                    plannedWeight: textOrNull(set.weight),
                    plannedReps: textOrNull(set.reps),
                    rpe: set.intensityKind === 'rpe' ? textOrNull(set.intensity) : null,
                    rir: set.intensityKind === 'rir' ? textOrNull(set.intensity) : null,
                    notes: set.notes.trim() === '' ? null : set.notes.trim(),
                })),
            })),
        }

        try {
            if (editing) {
                await update.mutateAsync({ id: templateId, input })
                track('workout_template_updated', {})
            } else {
                await create.mutateAsync(input)
                track('workout_template_created', {})
            }
            onSaved()
        } catch (err) {
            setRawError(err)
            setError(errorMessage(err))
        }
    }

    if (editing && loadingTemplate && !seeded) {
        return <p className="text-body text-text-dim">{t('loadingTemplate')}</p>
    }

    return (
        <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="font-mono text-eyebrow uppercase text-text-faint">{t('eyebrow')}</p>
                    <h1 className="mt-1 font-display text-h2 tracking-tight">
                        {editing ? t('editTitle') : t('newTemplate')}
                    </h1>
                </div>
                <TrackedButton
                    analyticsId="template-builder-back"
                    type="button"
                    onClick={onClose}
                    className="rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                >
                    {t('back')}
                </TrackedButton>
            </div>

            <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
                    <div className="inset-hi flex flex-col gap-4 rounded-[calc(1rem-0.25rem)] bg-surface p-5 sm:flex-row">
                        <div className="w-full sm:w-72">
                            <Field label={t('name')} htmlFor="tmpl-name">
                                <Input
                                    id="tmpl-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={t('namePlaceholder')}
                                />
                            </Field>
                        </div>
                        <div className="flex-1">
                            <Field label={tw('notesOptional')} htmlFor="tmpl-notes">
                                <Input
                                    id="tmpl-notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder={t('notesPlaceholder')}
                                />
                            </Field>
                        </div>
                    </div>
                </div>

                {draft.map((exercise) => (
                    <ExerciseCard
                        key={exercise.key}
                        exercise={exercise}
                        name={nameById.get(exercise.exerciseId) ?? tw('exercise')}
                        units={units}
                        onRemove={() => removeExercise(exercise.key)}
                        onNotes={(value) => patchExercise(exercise.key, { notes: value })}
                        onAddSet={() => addSet(exercise.key)}
                        onPatchSet={(setKey, patch) => patchSet(exercise.key, setKey, patch)}
                        onRemoveSet={(setKey) => removeSet(exercise.key, setKey)}
                    />
                ))}

                {picking ? (
                    <ExercisePicker
                        exercises={exercises ?? []}
                        onPick={addExercise}
                        onClose={() => setPicking(false)}
                    />
                ) : (
                    <TrackedButton
                        analyticsId="template-add-exercise"
                        type="button"
                        onClick={() => setPicking(true)}
                        className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1]"
                    >
                        <Plus className="size-4" /> {tw('addExercise')}
                    </TrackedButton>
                )}
            </div>

            {isPlanRefusal(rawError) ? (
                <div className="mt-5">
                    <UpgradeGate error={rawError} />
                </div>
            ) : (
                <FormError error={error} className="mt-5" />
            )}

            <div className="mt-6 flex items-center gap-2">
                <TrackedButton
                    analyticsId="template-save"
                    type="button"
                    onClick={onSave}
                    disabled={pending}
                    className="inline-flex items-center gap-2 rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98] disabled:opacity-60"
                >
                    {pending ? tw('saving') : editing ? t('saveChanges') : t('createTemplate')}
                </TrackedButton>
                <TrackedButton
                    analyticsId="template-builder-cancel"
                    type="button"
                    onClick={onClose}
                    className="rounded-full px-4 py-2.5 text-sm text-text-dim transition-colors duration-300 hover:text-text"
                >
                    {tw('cancel')}
                </TrackedButton>
            </div>
        </div>
    )
}

function ExerciseCard({
    exercise,
    name,
    units,
    onRemove,
    onNotes,
    onAddSet,
    onPatchSet,
    onRemoveSet,
}: {
    exercise: DraftExercise
    name: string
    units: Units
    onRemove: () => void
    onNotes: (value: string) => void
    onAddSet: () => void
    onPatchSet: (setKey: string, patch: Partial<DraftSet>) => void
    onRemoveSet: (setKey: string) => void
}) {
    const t = useTranslations('templates')
    const tw = useTranslations('workouts')
    return (
        <div className="rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(1rem-0.25rem)] bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg tracking-tight">{name}</h3>
                    <TrackedButton
                        analyticsId="template-remove-exercise"
                        type="button"
                        onClick={onRemove}
                        aria-label={t('removeExercise', { name })}
                        className="grid size-8 place-items-center rounded-full text-text-faint transition-colors duration-300 hover:bg-ember/10 hover:text-ember"
                    >
                        <Trash className="size-4" />
                    </TrackedButton>
                </div>

                <Input
                    value={exercise.notes}
                    onChange={(e) => onNotes(e.target.value)}
                    placeholder={t('exerciseNotesPlaceholder')}
                    className="mt-3"
                />

                <div className="mt-4 space-y-2">
                    <div className="grid grid-cols-[1.5rem_1fr_1fr_1.3fr_auto] items-center gap-2 px-1 font-mono text-[10px] uppercase tracking-widest text-text-faint">
                        <span>#</span>
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
                            onPatch={(patch) => onPatchSet(set.key, patch)}
                            onRemove={() => onRemoveSet(set.key)}
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

const cellClass =
    'w-full rounded-xl bg-bg/60 px-3 py-2 text-sm text-text ring-1 ring-hairline outline-none transition-colors duration-300 placeholder:text-text-faint focus:ring-ember/50'

function SetRow({
    set,
    index,
    onPatch,
    onRemove,
}: {
    set: DraftSet
    index: number
    onPatch: (patch: Partial<DraftSet>) => void
    onRemove: () => void
}) {
    const t = useTranslations('templates')
    const tw = useTranslations('workouts')
    return (
        <div className="grid grid-cols-[1.5rem_1fr_1fr_1.3fr_auto] items-center gap-2">
            <span className="text-right font-mono text-xs text-text-faint">{index}</span>
            {/* Text, not number: a range like `50-55` needs the hyphen the numeric
                keypad hides. `inputMode="decimal"` still brings up digits on mobile. */}
            <input
                type="text"
                inputMode="decimal"
                value={set.weight}
                onChange={(e) => onPatch({ weight: e.target.value })}
                placeholder={tw('rangePlaceholder')}
                className={cellClass}
            />
            <input
                type="text"
                inputMode="numeric"
                value={set.reps}
                onChange={(e) => onPatch({ reps: e.target.value })}
                placeholder={tw('rangePlaceholder')}
                className={cellClass}
            />
            <div className="flex items-center gap-1.5">
                <select
                    value={set.intensityKind}
                    onChange={(e) => onPatch({ intensityKind: e.target.value as IntensityKind, intensity: '' })}
                    className={cn(cellClass, 'appearance-none')}
                    aria-label={t('intensityType')}
                >
                    <option value="none">—</option>
                    <option value="rpe">RPE</option>
                    <option value="rir">RIR</option>
                </select>
                <input
                    type="text"
                    inputMode="decimal"
                    value={set.intensity}
                    onChange={(e) => onPatch({ intensity: e.target.value })}
                    disabled={set.intensityKind === 'none'}
                    placeholder={set.intensityKind === 'none' ? '' : '0'}
                    className={cn(cellClass, 'w-16 disabled:opacity-40')}
                    aria-label={t('intensityValue')}
                />
            </div>
            <TrackedButton
                analyticsId="template-remove-set"
                type="button"
                onClick={onRemove}
                aria-label={t('removeSet', { index })}
                className="grid size-8 place-items-center rounded-full text-text-faint transition-colors duration-300 hover:bg-ember/10 hover:text-ember"
            >
                <Close className="size-4" />
            </TrackedButton>
        </div>
    )
}
