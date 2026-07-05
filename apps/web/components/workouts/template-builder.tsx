'use client'

import { useEffect, useMemo, useState } from 'react'

import { track } from '@/lib/analytics/events'
import { cn } from '@/lib/cn'
import { gqlErrorMessage } from '@/lib/graphql/error'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import { type ExerciseData, useExercises } from '@/lib/graphql/hooks/use-workouts'
import {
    type WorkoutTemplateData,
    useCreateWorkoutTemplate,
    useUpdateWorkoutTemplate,
    useWorkoutTemplate,
} from '@/lib/graphql/hooks/use-workout-templates'
import { kgTo, type Units, unitsOf } from '@/lib/units'
import { Field, Input } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { Close, Plus, Search, Trash } from '@/components/ui/icons'
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select'
import { TrackedButton } from '@/components/ui/tracked'

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

/** Round a display-unit value to a tidy 2-decimal string for editing (drops
 *  float noise from unit conversion; no trailing zeros). */
function weightToInput(kg: number | null, units: Units): string {
    if (kg === null) return ''
    const v = kgTo(units, kg)
    return String(Math.round(v * 100) / 100)
}

/** Build the editable draft from a loaded template (kg → display units). */
function draftFromTemplate(template: WorkoutTemplateData, units: Units): DraftExercise[] {
    return template.exercises.map((exercise) => ({
        key: newKey(),
        exerciseId: exercise.exerciseId,
        notes: exercise.notes ?? '',
        sets: exercise.sets.map((set) => ({
            key: newKey(),
            weight: weightToInput(set.plannedWeightKg, units),
            reps: set.plannedReps !== null ? String(set.plannedReps) : '',
            intensityKind: set.rpe !== null ? 'rpe' : set.rir !== null ? 'rir' : 'none',
            intensity: set.rpe !== null ? String(set.rpe) : set.rir !== null ? String(set.rir) : '',
            notes: set.notes ?? '',
        })),
    }))
}

function numberOrNull(value: string): number | null {
    const trimmed = value.trim()
    if (trimmed === '') return null
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : null
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

    const [name, setName] = useState('')
    const [notes, setNotes] = useState('')
    const [draft, setDraft] = useState<DraftExercise[]>([])
    const [error, setError] = useState<string | null>(null)
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
        if (name.trim() === '') {
            setError('Give your template a name.')
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
                    plannedWeight: numberOrNull(set.weight),
                    plannedReps: numberOrNull(set.reps),
                    rpe: set.intensityKind === 'rpe' ? numberOrNull(set.intensity) : null,
                    rir: set.intensityKind === 'rir' ? numberOrNull(set.intensity) : null,
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
            setError(gqlErrorMessage(err))
        }
    }

    if (editing && loadingTemplate && !seeded) {
        return <p className="text-body text-text-dim">Loading template…</p>
    }

    return (
        <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="font-mono text-eyebrow uppercase text-text-faint">Template</p>
                    <h1 className="mt-1 font-display text-h2 tracking-tight">
                        {editing ? 'Edit template' : 'New template'}
                    </h1>
                </div>
                <TrackedButton
                    analyticsId="template-builder-back"
                    type="button"
                    onClick={onClose}
                    className="rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                >
                    Back
                </TrackedButton>
            </div>

            <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
                    <div className="inset-hi flex flex-col gap-4 rounded-[calc(1rem-0.25rem)] bg-surface p-5 sm:flex-row">
                        <div className="w-full sm:w-72">
                            <Field label="Name" htmlFor="tmpl-name">
                                <Input
                                    id="tmpl-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Upper A"
                                />
                            </Field>
                        </div>
                        <div className="flex-1">
                            <Field label="Notes (optional)" htmlFor="tmpl-notes">
                                <Input
                                    id="tmpl-notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="e.g. Push focus, week 1–4"
                                />
                            </Field>
                        </div>
                    </div>
                </div>

                {draft.map((exercise) => (
                    <ExerciseCard
                        key={exercise.key}
                        exercise={exercise}
                        name={nameById.get(exercise.exerciseId) ?? 'Exercise'}
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
                        <Plus className="size-4" /> Add exercise
                    </TrackedButton>
                )}
            </div>

            <FormError error={error} className="mt-5" />

            <div className="mt-6 flex items-center gap-2">
                <TrackedButton
                    analyticsId="template-save"
                    type="button"
                    onClick={onSave}
                    disabled={pending}
                    className="inline-flex items-center gap-2 rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98] disabled:opacity-60"
                >
                    {pending ? 'Saving…' : editing ? 'Save changes' : 'Create template'}
                </TrackedButton>
                <TrackedButton
                    analyticsId="template-builder-cancel"
                    type="button"
                    onClick={onClose}
                    className="rounded-full px-4 py-2.5 text-sm text-text-dim transition-colors duration-300 hover:text-text"
                >
                    Cancel
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
    return (
        <div className="rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(1rem-0.25rem)] bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg tracking-tight">{name}</h3>
                    <TrackedButton
                        analyticsId="template-remove-exercise"
                        type="button"
                        onClick={onRemove}
                        aria-label={`Remove ${name}`}
                        className="grid size-8 place-items-center rounded-full text-text-faint transition-colors duration-300 hover:bg-ember/10 hover:text-ember"
                    >
                        <Trash className="size-4" />
                    </TrackedButton>
                </div>

                <Input
                    value={exercise.notes}
                    onChange={(e) => onNotes(e.target.value)}
                    placeholder="Exercise notes (optional)"
                    className="mt-3"
                />

                <div className="mt-4 space-y-2">
                    <div className="grid grid-cols-[1.5rem_1fr_1fr_1.3fr_auto] items-center gap-2 px-1 font-mono text-[10px] uppercase tracking-widest text-text-faint">
                        <span>#</span>
                        <span>Weight ({units})</span>
                        <span>Reps</span>
                        <span>Intensity</span>
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
                    <Plus className="size-3.5" /> Add set
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
    return (
        <div className="grid grid-cols-[1.5rem_1fr_1fr_1.3fr_auto] items-center gap-2">
            <span className="text-right font-mono text-xs text-text-faint">{index}</span>
            <input
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={set.weight}
                onChange={(e) => onPatch({ weight: e.target.value })}
                placeholder="—"
                className={cellClass}
            />
            <input
                type="number"
                inputMode="numeric"
                min={1}
                value={set.reps}
                onChange={(e) => onPatch({ reps: e.target.value })}
                placeholder="—"
                className={cellClass}
            />
            <div className="flex items-center gap-1.5">
                <select
                    value={set.intensityKind}
                    onChange={(e) => onPatch({ intensityKind: e.target.value as IntensityKind, intensity: '' })}
                    className={cn(cellClass, 'appearance-none')}
                    aria-label="Intensity type"
                >
                    <option value="none">—</option>
                    <option value="rpe">RPE</option>
                    <option value="rir">RIR</option>
                </select>
                <input
                    type="number"
                    inputMode="decimal"
                    step={set.intensityKind === 'rpe' ? '0.5' : '1'}
                    value={set.intensity}
                    onChange={(e) => onPatch({ intensity: e.target.value })}
                    disabled={set.intensityKind === 'none'}
                    placeholder={set.intensityKind === 'none' ? '' : '0'}
                    className={cn(cellClass, 'w-16 disabled:opacity-40')}
                    aria-label="Intensity value"
                />
            </div>
            <TrackedButton
                analyticsId="template-remove-set"
                type="button"
                onClick={onRemove}
                aria-label={`Remove set ${index}`}
                className="grid size-8 place-items-center rounded-full text-text-faint transition-colors duration-300 hover:bg-ember/10 hover:text-ember"
            >
                <Close className="size-4" />
            </TrackedButton>
        </div>
    )
}

function titleCase(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1)
}

/** Distinct field values in first-seen order (catalog is pre-sorted by taxonomy). */
function optionsFor(exercises: ExerciseData[], pick: (e: ExerciseData) => string): MultiSelectOption[] {
    const seen = new Set<string>()
    const out: MultiSelectOption[] = []

    for (const exercise of exercises) {
        const value = pick(exercise)
        if (seen.has(value)) continue

        seen.add(value)
        out.push({ value, label: titleCase(value) })
    }

    return out
}

/** Inline catalog picker (name search + category/equipment/muscle filters) used
 *  to append an exercise to the template. */
function ExercisePicker({
    exercises,
    onPick,
    onClose,
}: {
    exercises: ExerciseData[]
    onPick: (exerciseId: string) => void
    onClose: () => void
}) {
    const [query, setQuery] = useState('')
    const [categories, setCategories] = useState<string[]>([])
    const [equipment, setEquipment] = useState<string[]>([])
    const [muscles, setMuscles] = useState<string[]>([])

    const categoryOptions = useMemo(() => optionsFor(exercises, (e) => e.category), [exercises])
    const equipmentOptions = useMemo(() => optionsFor(exercises, (e) => e.equipment), [exercises])
    const muscleOptions = useMemo(() => optionsFor(exercises, (e) => e.primaryMuscle), [exercises])

    const term = query.trim().toLowerCase()
    const hasFilters = categories.length > 0 || equipment.length > 0 || muscles.length > 0 || term !== ''

    const filtered = useMemo(
        () =>
            exercises.filter(
                (e) =>
                    (term === '' || e.name.toLowerCase().includes(term)) &&
                    (categories.length === 0 || categories.includes(e.category)) &&
                    (equipment.length === 0 || equipment.includes(e.equipment)) &&
                    (muscles.length === 0 || muscles.includes(e.primaryMuscle)),
            ),
        [exercises, term, categories, equipment, muscles],
    )

    function reset() {
        setQuery('')
        setCategories([])
        setEquipment([])
        setMuscles([])
    }

    return (
        <div className="rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(1rem-0.25rem)] bg-surface p-5">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-faint" />
                        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
                        <Input
                            autoFocus
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search exercises…"
                            className="pl-10"
                        />
                    </div>
                    <TrackedButton
                        analyticsId="exercise-picker-cancel"
                        type="button"
                        onClick={onClose}
                        className="rounded-full px-3 py-2.5 text-sm text-text-dim transition-colors duration-300 hover:text-text"
                    >
                        Cancel
                    </TrackedButton>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <MultiSelect
                        analyticsId="exercise-filter-category"
                        label="Category"
                        options={categoryOptions}
                        selected={categories}
                        onChange={setCategories}
                    />
                    <MultiSelect
                        analyticsId="exercise-filter-equipment"
                        label="Equipment"
                        options={equipmentOptions}
                        selected={equipment}
                        onChange={setEquipment}
                    />
                    <MultiSelect
                        analyticsId="exercise-filter-muscle"
                        label="Muscle"
                        options={muscleOptions}
                        selected={muscles}
                        onChange={setMuscles}
                    />
                    {hasFilters ? (
                        <TrackedButton
                            analyticsId="exercise-filter-clear"
                            type="button"
                            onClick={reset}
                            className="rounded-full px-3 py-1.5 text-sm text-text-dim transition-colors duration-300 hover:text-text"
                        >
                            Clear
                        </TrackedButton>
                    ) : null}
                </div>

                <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">
                    {filtered.map((exercise) => (
                        <li key={exercise.id}>
                            <TrackedButton
                                analyticsId="exercise-picker-pick"
                                type="button"
                                onClick={() => onPick(exercise.id)}
                                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-300 hover:bg-white/[0.04]"
                            >
                                <span className="text-sm text-text">{exercise.name}</span>
                                <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                                    {exercise.category} · {exercise.equipment} · {exercise.primaryMuscle}
                                </span>
                            </TrackedButton>
                        </li>
                    ))}
                    {filtered.length === 0 ? (
                        <li className="px-3 py-2.5 text-sm text-text-faint">No exercises match.</li>
                    ) : null}
                </ul>
            </div>
        </div>
    )
}
