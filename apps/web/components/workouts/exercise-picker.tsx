'use client'

import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { type ExerciseData } from '@/lib/graphql/hooks/use-workouts'
import { Input } from '@/components/ui/field'
import { Search } from '@/components/ui/icons'
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select'
import { TrackedButton } from '@/components/ui/tracked'

/** Distinct field values in first-seen order (catalog is pre-sorted by taxonomy),
 *  labelled via the caller's (localized) label function. */
function optionsFor(
    exercises: ExerciseData[],
    pick: (e: ExerciseData) => string,
    label: (value: string) => string,
): MultiSelectOption[] {
    const seen = new Set<string>()
    const out: MultiSelectOption[] = []

    for (const exercise of exercises) {
        const value = pick(exercise)
        if (seen.has(value)) continue

        seen.add(value)
        out.push({ value, label: label(value) })
    }

    return out
}

/** Inline catalog picker (name search + category/equipment/muscle filters) used to
 *  append an exercise to a template or mesocycle day. */
export function ExercisePicker({
    exercises,
    onPick,
    onClose,
}: {
    exercises: ExerciseData[]
    onPick: (exerciseId: string) => void
    onClose: () => void
}) {
    const tw = useTranslations('workouts')
    const tt = useTranslations('taxonomy')
    const [query, setQuery] = useState('')
    const [categories, setCategories] = useState<string[]>([])
    const [equipment, setEquipment] = useState<string[]>([])
    const [muscles, setMuscles] = useState<string[]>([])

    const categoryOptions = useMemo(
        () =>
            optionsFor(
                exercises,
                (e) => e.category,
                (v) => tt(`category.${v}`),
            ),
        [exercises, tt],
    )
    const equipmentOptions = useMemo(
        () =>
            optionsFor(
                exercises,
                (e) => e.equipment,
                (v) => tt(`equipment.${v}`),
            ),
        [exercises, tt],
    )
    const muscleOptions = useMemo(
        () =>
            optionsFor(
                exercises,
                (e) => e.primaryMuscle,
                (v) => tt(`muscle.${v}`),
            ),
        [exercises, tt],
    )

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
                            placeholder={tw('searchExercises')}
                            className="pl-10"
                        />
                    </div>
                    <TrackedButton
                        analyticsId="exercise-picker-cancel"
                        type="button"
                        onClick={onClose}
                        className="rounded-full px-3 py-2.5 text-sm text-text-dim transition-colors duration-300 hover:text-text"
                    >
                        {tw('cancel')}
                    </TrackedButton>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <MultiSelect
                        analyticsId="exercise-filter-category"
                        label={tw('filterCategory')}
                        options={categoryOptions}
                        selected={categories}
                        onChange={setCategories}
                    />
                    <MultiSelect
                        analyticsId="exercise-filter-equipment"
                        label={tw('filterEquipment')}
                        options={equipmentOptions}
                        selected={equipment}
                        onChange={setEquipment}
                    />
                    <MultiSelect
                        analyticsId="exercise-filter-muscle"
                        label={tw('filterMuscle')}
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
                            {tw('clear')}
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
                                    {tt(`category.${exercise.category}`)} · {tt(`equipment.${exercise.equipment}`)} ·{' '}
                                    {tt(`muscle.${exercise.primaryMuscle}`)}
                                </span>
                            </TrackedButton>
                        </li>
                    ))}
                    {filtered.length === 0 ? (
                        <li className="px-3 py-2.5 text-sm text-text-faint">{tw('noExercisesMatch')}</li>
                    ) : null}
                </ul>
            </div>
        </div>
    )
}
