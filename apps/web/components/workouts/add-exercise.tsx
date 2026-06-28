'use client'

import { useMemo, useState } from 'react'

import { type ExerciseData, useAddExerciseEntry, useExercises } from '@/lib/graphql/hooks/use-workouts'
import { Input } from '@/components/ui/field'
import { Plus } from '@/components/ui/icons'
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select'

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

/** Catalog picker: a toggle that expands into a searchable, filterable exercise
 *  list and appends the chosen exercise to the session. */
export function AddExercise({ sessionId }: { sessionId: string }) {
    const { data: exercises, isLoading } = useExercises()
    const add = useAddExerciseEntry()
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const [categories, setCategories] = useState<string[]>([])
    const [equipment, setEquipment] = useState<string[]>([])
    const [muscles, setMuscles] = useState<string[]>([])

    const catalog = exercises ?? []

    const categoryOptions = useMemo(() => optionsFor(catalog, (e) => e.category), [catalog])
    const equipmentOptions = useMemo(() => optionsFor(catalog, (e) => e.equipment), [catalog])
    const muscleOptions = useMemo(() => optionsFor(catalog, (e) => e.primaryMuscle), [catalog])

    const term = query.trim().toLowerCase()
    const hasFilters = categories.length > 0 || equipment.length > 0 || muscles.length > 0 || term !== ''

    const filtered = useMemo(
        () =>
            catalog.filter(
                (e) =>
                    (term === '' || e.name.toLowerCase().includes(term)) &&
                    (categories.length === 0 || categories.includes(e.category)) &&
                    (equipment.length === 0 || equipment.includes(e.equipment)) &&
                    (muscles.length === 0 || muscles.includes(e.primaryMuscle)),
            ),
        [catalog, term, categories, equipment, muscles],
    )

    function reset() {
        setQuery('')
        setCategories([])
        setEquipment([])
        setMuscles([])
    }

    function pick(exerciseId: string) {
        add.mutate(
            { exerciseId, sessionId },
            {
                onSuccess: () => {
                    setOpen(false)
                    reset()
                },
            },
        )
    }

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1]"
            >
                <Plus className="size-4" /> Add exercise
            </button>
        )
    }

    return (
        <div className="rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(1rem-0.25rem)] bg-surface p-5">
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
                        <Input
                            autoFocus
                            placeholder="Search exercises…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setOpen(false)
                            reset()
                        }}
                        className="rounded-full px-3 py-2.5 text-sm text-text-dim transition-colors duration-300 hover:text-text"
                    >
                        Cancel
                    </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <MultiSelect
                        label="Category"
                        options={categoryOptions}
                        selected={categories}
                        onChange={setCategories}
                    />
                    <MultiSelect
                        label="Equipment"
                        options={equipmentOptions}
                        selected={equipment}
                        onChange={setEquipment}
                    />
                    <MultiSelect label="Muscle" options={muscleOptions} selected={muscles} onChange={setMuscles} />
                    {hasFilters ? (
                        <button
                            type="button"
                            onClick={reset}
                            className="rounded-full px-3 py-1.5 text-sm text-text-dim transition-colors duration-300 hover:text-text"
                        >
                            Clear
                        </button>
                    ) : null}
                </div>

                {isLoading ? (
                    <p className="mt-3 text-sm text-text-dim">Loading catalog…</p>
                ) : (
                    <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto">
                        {filtered.map((exercise) => (
                            <li key={exercise.id}>
                                <button
                                    type="button"
                                    onClick={() => pick(exercise.id)}
                                    disabled={add.isPending}
                                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-300 hover:bg-white/[0.04] disabled:opacity-50"
                                >
                                    <span className="text-sm text-text">{exercise.name}</span>
                                    <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                                        {exercise.category} · {exercise.equipment} · {exercise.primaryMuscle}
                                    </span>
                                </button>
                            </li>
                        ))}
                        {filtered.length === 0 ? (
                            <li className="px-3 py-2.5 text-sm text-text-faint">No exercises match.</li>
                        ) : null}
                    </ul>
                )}
            </div>
        </div>
    )
}
