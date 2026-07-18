'use client'

import { useTranslations } from 'next-intl'
import { type SubmitEvent, useEffect, useId, useMemo, useRef, useState } from 'react'

import { EXERCISE_CATEGORIES, EXERCISE_EQUIPMENT, EXERCISE_MUSCLES } from '@/lib/exercise-taxonomy'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import {
    type AdminExercise,
    useAdminExercises,
    useCreateExercise,
    useDeleteExercise,
    useUpdateExercise,
} from '@/lib/graphql/hooks/use-admin-exercises'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { AdminTabs } from '@/components/admin/admin-tabs'
import { ClearableSearch } from '@/components/ui/clearable-search'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Field, Input, Select } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { Pencil, Plus, Trash } from '@/components/ui/icons'
import { Modal } from '@/components/ui/modal'
import { MultiSelect } from '@/components/ui/multi-select'
import { Skeleton } from '@/components/ui/skeleton'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { TrackedButton } from '@/components/ui/tracked'

/** Taxonomy options with localized labels, keyed by the (canonical) enum value. */
function useTaxonomyOptions() {
    const tt = useTranslations('taxonomy')
    return useMemo(
        () => ({
            categories: EXERCISE_CATEGORIES.map((value) => ({ value, label: tt(`category.${value}`) })),
            equipment: EXERCISE_EQUIPMENT.map((value) => ({ value, label: tt(`equipment.${value}`) })),
            muscles: EXERCISE_MUSCLES.map((value) => ({ value, label: tt(`muscle.${value}`) })),
        }),
        [tt],
    )
}

/** Edit / delete controls for one exercise — shared by the mobile cards and the desktop grid. */
function ExerciseActions({
    exercise,
    onEdit,
    onDelete,
}: {
    exercise: AdminExercise
    onEdit: () => void
    onDelete: () => void
}) {
    const t = useTranslations('admin')

    return (
        <div className="flex shrink-0 items-center justify-end gap-1">
            <TrackedButton
                analyticsId="admin-exercise-edit"
                type="button"
                onClick={onEdit}
                aria-label={t('editAria', { name: exercise.name })}
                className="grid size-8 place-items-center rounded-full text-text-dim transition-colors duration-300 hover:bg-white/[0.05] hover:text-text"
            >
                <Pencil className="size-4" />
            </TrackedButton>
            <TrackedButton
                analyticsId="admin-exercise-delete-open"
                type="button"
                onClick={onDelete}
                aria-label={t('deleteAria', { name: exercise.name })}
                className="grid size-8 place-items-center rounded-full text-text-dim transition-colors duration-300 hover:bg-ember/10 hover:text-ember"
            >
                <Trash className="size-4" />
            </TrackedButton>
        </div>
    )
}

/** A labelled taxonomy value inside a mobile exercise card. */
function Meta({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="font-mono text-eyebrow uppercase text-text-faint">{label}</dt>
            <dd className="mt-0.5 text-text-dim">{value}</dd>
        </div>
    )
}

export default function AdminExercisesPage() {
    const t = useTranslations('admin')
    const tt = useTranslations('taxonomy')
    const tw = useTranslations('workouts')
    const { categories: CATEGORY_OPTIONS, equipment: EQUIPMENT_OPTIONS, muscles: MUSCLE_OPTIONS } = useTaxonomyOptions()
    const [rawSearch, setRawSearch] = useState('')
    const search = useDebouncedValue(rawSearch, 250)
    const [categories, setCategories] = useState<string[]>([])
    const [equipment, setEquipment] = useState<string[]>([])
    const [muscles, setMuscles] = useState<string[]>([])

    const [editing, setEditing] = useState<AdminExercise | null>(null)
    const [creating, setCreating] = useState(false)
    const [deleting, setDeleting] = useState<AdminExercise | null>(null)

    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAdminExercises({
        search,
        categories,
        equipment,
        muscles,
    })
    const exercises = data?.pages.flatMap((page) => page.rows) ?? []
    const total = data?.pages[0]?.total ?? 0

    // Infinite scroll: load the next page when the sentinel scrolls into view.
    const sentinelRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const el = sentinelRef.current
        if (!el || !hasNextPage) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage()
            },
            { rootMargin: '400px' },
        )
        observer.observe(el)

        return () => observer.disconnect()
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    const filtersActive = categories.length + equipment.length + muscles.length > 0 || search.trim().length > 0

    return (
        <div>
            <TextsReveal>
                <p className="font-mono text-eyebrow uppercase text-text-faint">{t('eyebrow')}</p>
                <h1 className="mt-1 font-display text-h2 tracking-tight">{t('catalogTitle')}</h1>
            </TextsReveal>

            <div className="mt-8">
                <AdminTabs />
            </div>

            <div className="flex justify-end">
                <TrackedButton
                    analyticsId="admin-exercise-new-open"
                    type="button"
                    onClick={() => setCreating(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-ember-gradient px-4 py-2 text-sm font-medium text-bg transition-opacity duration-300 hover:opacity-90 active:scale-[0.98]"
                >
                    <Plus className="size-4" />
                    {t('newExercise')}
                </TrackedButton>
            </div>

            {/* Filters */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <ClearableSearch
                    analyticsId="admin-exercises-search"
                    value={rawSearch}
                    onChange={setRawSearch}
                    placeholder={t('searchNameSlug')}
                    className="w-64"
                />
                <MultiSelect
                    analyticsId="admin-exercises-filter-category"
                    label={t('colCategory')}
                    options={CATEGORY_OPTIONS}
                    selected={categories}
                    onChange={setCategories}
                />
                <MultiSelect
                    analyticsId="admin-exercises-filter-equipment"
                    label={t('colEquipment')}
                    options={EQUIPMENT_OPTIONS}
                    selected={equipment}
                    onChange={setEquipment}
                />
                <MultiSelect
                    analyticsId="admin-exercises-filter-muscle"
                    label={t('colMuscle')}
                    options={MUSCLE_OPTIONS}
                    selected={muscles}
                    onChange={setMuscles}
                />
                {filtersActive ? (
                    <TrackedButton
                        analyticsId="admin-exercises-filter-clear"
                        type="button"
                        onClick={() => {
                            setRawSearch('')
                            setCategories([])
                            setEquipment([])
                            setMuscles([])
                        }}
                        className="text-sm text-text-dim transition-colors duration-300 hover:text-text"
                    >
                        {tw('clear')}
                    </TrackedButton>
                ) : null}
            </div>

            {/* List */}
            <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-hairline">
                <div className="hidden grid-cols-[1.6fr_1fr_1fr_1fr_auto] gap-3 bg-white/[0.02] px-5 py-3 font-mono text-eyebrow uppercase text-text-faint md:grid">
                    <span>{t('colName')}</span>
                    <span>{t('colCategory')}</span>
                    <span>{t('colEquipment')}</span>
                    <span>{t('colMuscle')}</span>
                    <span className="text-right">{t('colActions')}</span>
                </div>

                {isLoading ? (
                    <div className="space-y-2 p-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-12" />
                        ))}
                    </div>
                ) : exercises.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-text-dim">{t('noExercisesMatch')}</p>
                ) : (
                    <>
                        {/* Phone: one card per exercise. */}
                        <div className="divide-y divide-hairline md:hidden">
                            {exercises.map((exercise) => (
                                <div key={exercise.id} className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-text">{exercise.name}</p>
                                            <p className="truncate font-mono text-xs text-text-faint">
                                                {exercise.slug}
                                            </p>
                                        </div>
                                        <ExerciseActions
                                            exercise={exercise}
                                            onEdit={() => setEditing(exercise)}
                                            onDelete={() => setDeleting(exercise)}
                                        />
                                    </div>
                                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                                        <Meta label={t('colCategory')} value={tt(`category.${exercise.category}`)} />
                                        <Meta label={t('colEquipment')} value={tt(`equipment.${exercise.equipment}`)} />
                                        <Meta label={t('colMuscle')} value={tt(`muscle.${exercise.primaryMuscle}`)} />
                                    </dl>
                                </div>
                            ))}
                        </div>

                        {/* md and up: aligned grid rows. */}
                        <div className="hidden md:block">
                            {exercises.map((exercise) => (
                                <div
                                    key={exercise.id}
                                    className="grid grid-cols-[1.6fr_1fr_1fr_1fr_auto] items-center gap-3 border-t border-hairline px-5 py-3.5 text-sm"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-text">{exercise.name}</p>
                                        <p className="truncate font-mono text-xs text-text-faint">{exercise.slug}</p>
                                    </div>
                                    <span className="text-text-dim">{tt(`category.${exercise.category}`)}</span>
                                    <span className="text-text-dim">{tt(`equipment.${exercise.equipment}`)}</span>
                                    <span className="text-text-dim">{tt(`muscle.${exercise.primaryMuscle}`)}</span>
                                    <ExerciseActions
                                        exercise={exercise}
                                        onEdit={() => setEditing(exercise)}
                                        onDelete={() => setDeleting(exercise)}
                                    />
                                </div>
                            ))}
                        </div>

                        {isFetchingNextPage ? (
                            <div className="space-y-2 border-t border-hairline p-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-12" />
                                ))}
                            </div>
                        ) : null}

                        {/* Infinite-scroll trigger. */}
                        <div ref={sentinelRef} aria-hidden />
                    </>
                )}
            </div>

            {!isLoading && exercises.length > 0 ? (
                <p className="mt-3 text-right font-mono text-xs text-text-faint">
                    {t('countOf', { shown: exercises.length, total })}
                </p>
            ) : null}

            {(creating || editing) && (
                <ExerciseEditor
                    exercise={editing}
                    onClose={() => {
                        setCreating(false)
                        setEditing(null)
                    }}
                />
            )}

            <DeleteExercise exercise={deleting} onClose={() => setDeleting(null)} />
        </div>
    )
}

// ── create / edit form ───────────────────────────────────────

function ExerciseEditor({ exercise, onClose }: { exercise: AdminExercise | null; onClose: () => void }) {
    const t = useTranslations('admin')
    const tw = useTranslations('workouts')
    const { categories: CATEGORY_OPTIONS, equipment: EQUIPMENT_OPTIONS, muscles: MUSCLE_OPTIONS } = useTaxonomyOptions()
    const errorMessage = useErrorMessage()
    const titleId = useId()
    const create = useCreateExercise()
    const update = useUpdateExercise()
    const isEdit = exercise != null

    const [name, setName] = useState(exercise?.name ?? '')
    const [nameEs, setNameEs] = useState(exercise?.nameEs ?? '')
    const [slug, setSlug] = useState(exercise?.slug ?? '')
    const [category, setCategory] = useState(exercise?.category ?? EXERCISE_CATEGORIES[0])
    const [equipment, setEquipment] = useState(exercise?.equipment ?? EXERCISE_EQUIPMENT[0])
    const [primaryMuscle, setPrimaryMuscle] = useState(exercise?.primaryMuscle ?? EXERCISE_MUSCLES[0])
    const [error, setError] = useState<string | null>(null)

    const pending = create.isPending || update.isPending

    async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
        e.preventDefault()
        setError(null)
        try {
            if (isEdit) {
                // Always send nameEs so an emptied field clears the Spanish name.
                await update.mutateAsync({
                    exerciseId: exercise.id,
                    name,
                    category,
                    equipment,
                    primaryMuscle,
                    nameEs: nameEs.trim(),
                })
            } else {
                await create.mutateAsync({
                    name,
                    category,
                    equipment,
                    primaryMuscle,
                    slug: slug.trim() || null,
                    nameEs: nameEs.trim() || null,
                })
            }
            onClose()
        } catch (err) {
            setError(errorMessage(err))
        }
    }

    return (
        <Modal open onClose={onClose} labelledBy={titleId}>
            <h2 id={titleId} className="font-display text-h3 tracking-tight">
                {isEdit ? t('editExercise') : t('newExercise')}
            </h2>

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
                <Field label={t('nameEn')} htmlFor="ex-name">
                    <Input id="ex-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                </Field>

                <Field label={t('nameEs')} htmlFor="ex-name-es" hint={t('nameEsHint')}>
                    <Input id="ex-name-es" value={nameEs} onChange={(e) => setNameEs(e.target.value)} />
                </Field>

                <Field label={t('slug')} htmlFor="ex-slug" hint={isEdit ? t('slugImmutable') : t('slugOptional')}>
                    <Input
                        id="ex-slug"
                        value={isEdit ? exercise.slug : slug}
                        onChange={(e) => setSlug(e.target.value)}
                        placeholder="auto"
                        disabled={isEdit}
                        className="disabled:opacity-60"
                    />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Field label={t('colCategory')} htmlFor="ex-category">
                        <Select id="ex-category" value={category} onChange={(e) => setCategory(e.target.value)}>
                            {CATEGORY_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label={t('colEquipment')} htmlFor="ex-equipment">
                        <Select id="ex-equipment" value={equipment} onChange={(e) => setEquipment(e.target.value)}>
                            {EQUIPMENT_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                    <Field label={t('colMuscle')} htmlFor="ex-muscle">
                        <Select id="ex-muscle" value={primaryMuscle} onChange={(e) => setPrimaryMuscle(e.target.value)}>
                            {MUSCLE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </Select>
                    </Field>
                </div>

                <FormError error={error} />

                <div className="flex items-center justify-end gap-2 pt-1">
                    <TrackedButton
                        analyticsId="admin-exercise-editor-cancel"
                        type="button"
                        onClick={onClose}
                        disabled={pending}
                        className="rounded-full px-4 py-2 text-sm text-text-dim transition-colors duration-300 hover:text-text disabled:opacity-60"
                    >
                        {tw('cancel')}
                    </TrackedButton>
                    <TrackedButton
                        analyticsId="admin-exercise-editor-save"
                        type="submit"
                        disabled={pending}
                        className="rounded-full bg-ember-gradient px-5 py-2 text-sm font-medium text-bg transition-opacity duration-300 hover:opacity-90 disabled:opacity-60"
                    >
                        {pending ? tw('saving') : isEdit ? t('saveChanges') : t('create')}
                    </TrackedButton>
                </div>
            </form>
        </Modal>
    )
}

// ── delete ───────────────────────────────────────────────────

function DeleteExercise({ exercise, onClose }: { exercise: AdminExercise | null; onClose: () => void }) {
    const t = useTranslations('admin')
    const tw = useTranslations('workouts')
    const errorMessage = useErrorMessage()
    const remove = useDeleteExercise()
    const [error, setError] = useState<string | null>(null)

    async function onConfirm() {
        if (!exercise) return
        setError(null)
        try {
            await remove.mutateAsync(exercise.id)
            onClose()
        } catch (err) {
            setError(errorMessage(err))
        }
    }

    return (
        <ConfirmModal
            analyticsId="admin-exercise-delete"
            open={exercise != null}
            onClose={() => {
                setError(null)
                onClose()
            }}
            onConfirm={onConfirm}
            title={t('deleteExerciseTitle', { name: exercise?.name ?? tw('exercise') })}
            description={t('deleteExerciseBody')}
            confirmLabel={tw('delete')}
            destructive
            pending={remove.isPending}
            error={error}
        />
    )
}
