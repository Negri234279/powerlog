'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { type FormEvent, useMemo, useState } from 'react'

import { cn } from '@/lib/cn'
import { track } from '@/lib/analytics/events'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import {
    type ExerciseData,
    type WorkoutHistoryFilters,
    type WorkoutHistoryItem,
    type WorkoutSetData,
    useCreateWorkoutSession,
    useDeleteWorkoutSession,
    useExercises,
    useWorkoutHistory,
    useWorkoutSession,
} from '@/lib/graphql/hooks/use-workouts'
import { useCreateSessionFromTemplate } from '@/lib/graphql/hooks/use-workout-templates'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { formatWeight, type Units, unitsOf } from '@/lib/units'
import { computeRange, formatDay, formatRange, type PeriodMode } from '@/lib/workouts/period'
import { EditSessionModal } from '@/components/workouts/edit-session-modal'
import { PeriodNavigator } from '@/components/workouts/period-navigator'
import { type SelectedTemplate, TemplateBrowseModal, TemplateCombobox } from '@/components/workouts/template-select'
import { ClearableSearch } from '@/components/ui/clearable-search'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { FormError } from '@/components/ui/form-error'
import { Skeleton } from '@/components/ui/skeleton'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { Field, Input, Select } from '@/components/ui/field'
import { Calendar, ChartLine, ChevronDown, Dumbbell, Plus, Search } from '@/components/ui/icons'
import { Menu } from '@/components/ui/menu'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

function formatDate(iso: string, locale: string): string {
    return new Date(iso).toLocaleDateString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

/** Today as YYYY-MM-DD in the user's local timezone (for <input type="date">). */
function todayLocalIso(): string {
    const d = new Date()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${month}-${day}`
}

type StatusFilter = 'all' | 'planned' | 'completed'

const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'planned', 'completed']

function StatusBadge({ status }: { status: string }) {
    const t = useTranslations('common.status')
    const completed = status === 'completed'
    return (
        <span
            className={
                completed
                    ? 'rounded-full bg-pr/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-pr'
                    : 'rounded-full bg-ember/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-ember'
            }
        >
            {completed ? t('completed') : t('planned')}
        </span>
    )
}

function Stat({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="text-right">
            <p className="text-text">{value}</p>
            <p className="text-[10px] uppercase tracking-widest text-text-faint">{label}</p>
        </div>
    )
}

function SetLine({ set, units }: { set: WorkoutSetData; units: Units }) {
    const t = useTranslations('workouts')
    const hasActual = set.weightKg !== null && set.reps !== null
    const weight = hasActual ? set.weightKg : set.plannedWeightKg
    const reps = hasActual ? set.reps : set.plannedReps
    const intensity = set.rpe !== null ? `RPE ${set.rpe}` : set.rir !== null ? `RIR ${set.rir}` : null

    return (
        <div className="flex items-center gap-3 text-sm tabular-nums">
            <span className="w-4 shrink-0 text-right font-mono text-xs text-text-faint">{set.order}</span>
            <span className="text-text">
                {weight !== null && reps !== null ? `${formatWeight(weight, units)} × ${reps}` : '—'}
                {!hasActual && weight !== null ? (
                    <span className="text-text-faint"> · {t('plannedSuffix')}</span>
                ) : null}
            </span>
            {intensity ? <span className="text-text-dim">{intensity}</span> : null}
            {set.e1rmKg !== null ? (
                <span className="ml-auto font-mono text-xs text-text-faint">
                    e1RM {formatWeight(set.e1rmKg, units)}
                </span>
            ) : null}
        </div>
    )
}

function SessionDetailPanel({ id, units, nameById }: { id: string; units: Units; nameById: Map<string, string> }) {
    const t = useTranslations('workouts')
    const { data, isLoading, isError } = useWorkoutSession(id)

    if (isLoading)
        return <p className="border-t border-hairline px-5 py-4 text-sm text-text-dim">{t('loadingExercises')}</p>

    if (isError || !data)
        return <p className="border-t border-hairline px-5 py-4 text-sm text-ember">{t('loadError')}</p>

    if (data.entries.length === 0)
        return <p className="border-t border-hairline px-5 py-4 text-sm text-text-dim">{t('noExercises')}</p>

    return (
        <div className="space-y-4 border-t border-hairline px-5 py-4">
            {data.entries.map((entry) => (
                <div key={entry.id}>
                    <div className="flex items-baseline justify-between gap-3">
                        <h3 className="text-sm font-medium text-text">
                            {nameById.get(entry.exerciseId) ?? t('exercise')}
                        </h3>
                        <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                            {t('setCountLabel', { count: entry.sets.length })}
                        </span>
                    </div>
                    {entry.notes ? <p className="mt-0.5 text-xs text-text-dim">{entry.notes}</p> : null}
                    <div className="mt-2 space-y-1">
                        {entry.sets.length > 0 ? (
                            entry.sets.map((set) => <SetLine key={set.id} set={set} units={units} />)
                        ) : (
                            <p className="text-xs text-text-faint">{t('noSets')}</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}

function SessionRow({
    session,
    units,
    nameById,
    onEdit,
    onDelete,
}: {
    session: WorkoutHistoryItem
    units: Units
    nameById: Map<string, string>
    onEdit: () => void
    onDelete: () => void
}) {
    const t = useTranslations('workouts')
    const locale = useLocale()
    const [open, setOpen] = useState(false)
    // Mount the detail panel on first open and keep it mounted so the accordion
    // animates the collapse too (and the session isn't re-fetched on re-open).
    const [hasOpened, setHasOpened] = useState(false)

    function toggle() {
        setOpen((o) => {
            if (!o) setHasOpened(true)
            return !o
        })
    }

    return (
        <div className="rounded-2xl bg-shell p-1.5 ring-1 ring-hairline transition-all duration-300 hover:ring-text/20">
            <div className="t-acc inset-hi rounded-[calc(1rem-0.25rem)] bg-surface" data-open={open}>
                <div className="relative">
                    {/* Only the chevron toggles the panel; the card itself opens the session. */}
                    <div className="absolute inset-y-0 left-2 z-10 flex items-center">
                        <TrackedButton
                            analyticsId="session-row-expand"
                            type="button"
                            onClick={toggle}
                            aria-expanded={open}
                            aria-label={open ? t('collapse') : t('expand')}
                            className="flex size-8 items-center justify-center rounded-full text-text-faint transition-colors duration-300 hover:bg-white/[0.06] hover:text-text"
                        >
                            <span className="t-acc-chevron">
                                <ChevronDown className="size-4" />
                            </span>
                        </TrackedButton>
                    </div>

                    <TrackedLink
                        analyticsId="session-open"
                        href={`/workouts/${session.id}`}
                        className="flex flex-col gap-3 py-4 pl-12 pr-14 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="min-w-0">
                            <div className="flex items-center gap-3">
                                <span className="font-display text-lg tracking-tight">
                                    {formatDate(session.performedAt, locale)}
                                </span>
                                <StatusBadge status={session.status} />
                            </div>
                            {session.notes ? (
                                <p className="mt-0.5 max-w-md truncate text-sm text-text-dim">{session.notes}</p>
                            ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-5 font-mono text-sm tabular-nums">
                            <Stat label={t('statExercises')} value={session.exerciseCount} />
                            <Stat label={t('statSets')} value={session.setCount} />
                            <Stat label={t('statVolume')} value={formatWeight(session.totalVolumeKg, units)} />
                        </div>
                    </TrackedLink>

                    <div className="absolute inset-y-0 right-3 flex items-center">
                        <Menu
                            analyticsId="session-menu"
                            label={t('sessionActions')}
                            items={[
                                { label: t('edit'), onSelect: onEdit, analyticsId: 'session-menu-edit' },
                                {
                                    label: t('delete'),
                                    onSelect: onDelete,
                                    destructive: true,
                                    analyticsId: 'session-menu-delete',
                                },
                            ]}
                        />
                    </div>
                </div>
                <div className="t-acc-panel">
                    <div className="t-acc-panel-inner">
                        {hasOpened ? <SessionDetailPanel id={session.id} units={units} nameById={nameById} /> : null}
                    </div>
                </div>
            </div>
        </div>
    )
}

function FilterBar({
    exercises,
    status,
    onStatus,
    exerciseId,
    onExercise,
    queryInput,
    onQuery,
    hasActiveFilters,
    onClear,
}: {
    exercises: ExerciseData[]
    status: StatusFilter
    onStatus: (status: StatusFilter) => void
    exerciseId: string
    onExercise: (id: string) => void
    queryInput: string
    onQuery: (value: string) => void
    hasActiveFilters: boolean
    onClear: () => void
}) {
    const t = useTranslations('workouts')
    const tt = useTranslations('taxonomy')
    // Catalog already arrives ordered by category then name — keep that order.
    const groups = useMemo(() => {
        const byCategory = new Map<string, ExerciseData[]>()
        for (const ex of exercises) {
            const list = byCategory.get(ex.category) ?? []
            list.push(ex)
            byCategory.set(ex.category, list)
        }
        return [...byCategory.entries()]
    }, [exercises])

    return (
        <div className="mt-6 rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi flex flex-col gap-3 rounded-[calc(1rem-0.25rem)] bg-surface p-4">
                <ClearableSearch
                    analyticsId="workouts-search"
                    value={queryInput}
                    onChange={onQuery}
                    placeholder={t('searchNotes')}
                    className="w-full"
                />

                <div className="flex flex-wrap items-center gap-3">
                    <div className="inline-flex rounded-full bg-bg/60 p-1 ring-1 ring-hairline">
                        {STATUS_FILTERS.map((key) => (
                            <TrackedButton
                                analyticsId={`workouts-filter-${key}`}
                                key={key}
                                type="button"
                                onClick={() => onStatus(key)}
                                className={cn(
                                    'rounded-full px-4 py-1.5 text-sm transition-colors duration-300',
                                    status === key ? 'bg-white/[0.08] text-text' : 'text-text-dim hover:text-text',
                                )}
                            >
                                {t(`filter.${key}`)}
                            </TrackedButton>
                        ))}
                    </div>

                    <div className="min-w-[12rem] flex-1">
                        <Select
                            value={exerciseId}
                            onChange={(e) => onExercise(e.target.value)}
                            aria-label={t('filterByExercise')}
                        >
                            <option value="">{t('allExercises')}</option>
                            {groups.map(([category, items]) => (
                                <optgroup key={category} label={tt(`category.${category}`)}>
                                    {items.map((ex) => (
                                        <option key={ex.id} value={ex.id}>
                                            {ex.name}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </Select>
                    </div>

                    {hasActiveFilters ? (
                        <TrackedButton
                            analyticsId="workouts-filter-clear"
                            type="button"
                            onClick={onClear}
                            className="rounded-full px-4 py-2 text-sm text-text-dim transition-colors duration-300 hover:text-text"
                        >
                            {t('clear')}
                        </TrackedButton>
                    ) : null}
                </div>
            </div>
        </div>
    )
}

export default function WorkoutsPage() {
    const t = useTranslations('workouts')
    const errorMessage = useErrorMessage()
    const router = useRouter()
    const { data: me } = useMe()
    const units = unitsOf(me?.units)
    const create = useCreateWorkoutSession()
    const startFromTemplate = useCreateSessionFromTemplate()
    const del = useDeleteWorkoutSession()
    const { data: exercises } = useExercises()
    const [createError, setCreateError] = useState<string | null>(null)
    const [creating, setCreating] = useState(false)
    const [date, setDate] = useState(todayLocalIso)
    const [notes, setNotes] = useState('')
    const [template, setTemplate] = useState<SelectedTemplate | null>(null)
    const [browseOpen, setBrowseOpen] = useState(false)
    const [editing, setEditing] = useState<WorkoutHistoryItem | null>(null)
    const [deleting, setDeleting] = useState<WorkoutHistoryItem | null>(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const locale = useLocale()

    // Filter state. The text query is debounced before it hits the network.
    const [status, setStatus] = useState<StatusFilter>('all')
    const [exerciseId, setExerciseId] = useState('')
    const [from, setFrom] = useState('')
    const [to, setTo] = useState('')
    const [queryInput, setQueryInput] = useState('')
    const debouncedQuery = useDebouncedValue(queryInput.trim(), 300)

    // Period navigator — the single source of truth for the date window. Presets
    // (week/month/3m/6m) compute their own range; `custom` uses the from/to state
    // below (revealed inline); `all` is unbounded. Time is intentionally NOT a
    // filter-bar concern, so there's no second date control to reconcile.
    const [periodMode, setPeriodMode] = useState<PeriodMode>('week')
    const [periodOffset, setPeriodOffset] = useState(0)
    const periodRange = useMemo(() => computeRange(periodMode, periodOffset), [periodMode, periodOffset])

    // Effective ISO-date bounds (local calendar) before whole-day UTC framing.
    const rangeFrom = periodMode === 'custom' ? from : (periodRange?.from ?? '')
    const rangeTo = periodMode === 'custom' ? to : (periodRange?.to ?? '')
    // A bounded window with no rows reads as "empty range", not "no history".
    const hasDateWindow = periodMode === 'custom' ? from !== '' || to !== '' : periodMode !== 'all'

    function windowLabel(): string {
        if (periodMode === 'all') return t('period.allLabel')
        if (periodMode === 'custom') {
            if (!from && !to) return t('period.custom')
            return `${from ? formatDay(from, locale) : '…'} – ${to ? formatDay(to, locale) : '…'}`
        }
        return periodRange ? formatRange(periodMode, periodRange, locale) : ''
    }

    // Filters are orthogonal to time (status/exercise/text) — the date window is
    // owned by the navigator, so it's not counted here or reset by "Clear".
    const hasActiveFilters = status !== 'all' || exerciseId !== '' || queryInput.trim() !== ''

    const filters = useMemo<WorkoutHistoryFilters>(() => {
        const f: WorkoutHistoryFilters = {}
        if (status !== 'all') f.status = status
        if (exerciseId) f.exerciseId = exerciseId
        // Whole-day UTC bounds, consistent with how sessions are stored (noon UTC).
        if (rangeFrom) f.from = `${rangeFrom}T00:00:00.000Z`
        if (rangeTo) f.to = `${rangeTo}T23:59:59.999Z`
        if (debouncedQuery) f.query = debouncedQuery
        return f
    }, [status, exerciseId, rangeFrom, rangeTo, debouncedQuery])

    // Resolve exercise names for the expandable session detail panels.
    const nameById = useMemo(() => {
        const map = new Map<string, string>()

        for (const exercise of exercises ?? []) map.set(exercise.id, exercise.name)

        return map
    }, [exercises])

    function clearFilters() {
        setStatus('all')
        setExerciseId('')
        setQueryInput('')
    }

    const { data, isLoading, isError, isPlaceholderData, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useWorkoutHistory(filters)

    const items = data?.pages.flatMap((page) => page.items) ?? []
    const showFilters = !isLoading && (items.length > 0 || hasActiveFilters)
    // While a new filter combination loads, previous results stay visible
    // (keepPreviousData) — dim them slightly instead of flashing a loading state.
    const isFiltering = isPlaceholderData

    async function onCreate(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setCreateError(null)
        try {
            // Picking today keeps the API default (now, with a real time); any
            // other day is stored at noon UTC so it reads as that date everywhere.
            const performedAt = date === todayLocalIso() ? undefined : `${date}T12:00:00.000Z`
            const trimmed = notes.trim()
            const notesArg = trimmed === '' ? undefined : trimmed

            if (template) {
                const result = await startFromTemplate.mutateAsync({
                    templateId: template.id,
                    performedAt,
                    notes: notesArg,
                })
                track('session_created_from_template', {})
                router.push(`/workouts/${result.createSessionFromTemplate.id}`)
                return
            }

            const result = await create.mutateAsync({ performedAt, notes: notesArg })
            track('workout_session_created', {})
            router.push(`/workouts/${result.createWorkoutSession.id}`)
        } catch (error) {
            setCreateError(errorMessage(error))
        }
    }

    function onConfirmDelete() {
        if (!deleting) return
        setDeleteError(null)
        del.mutate(deleting.id, {
            onSuccess: () => {
                track('workout_session_deleted', {})
                setDeleting(null)
            },
            onError: (error) => setDeleteError(errorMessage(error)),
        })
    }

    return (
        <div className="">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <TextsReveal>
                    <p className="font-mono text-eyebrow uppercase text-text-faint">{t('training')}</p>
                    <h1 className="mt-3 font-display text-display">{t('title')}</h1>
                </TextsReveal>
                <div className="flex items-center gap-2">
                    <TrackedLink
                        analyticsId="workouts-templates-link"
                        href="/workouts/templates"
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                    >
                        <Dumbbell className="size-4" />
                        {t('templates')}
                    </TrackedLink>
                    <TrackedLink
                        analyticsId="workouts-stats-link"
                        href="/workouts/stats"
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                    >
                        <ChartLine className="size-4" />
                        {t('analytics')}
                    </TrackedLink>
                    <TrackedButton
                        analyticsId="session-create-open"
                        type="button"
                        onClick={() => setCreating((open) => !open)}
                        className="group inline-flex items-center gap-2 rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Plus className="size-4" />
                        {t('session')}
                    </TrackedButton>
                </div>
            </div>

            {creating ? (
                <form onSubmit={onCreate} className="mt-6 rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
                    <div className="inset-hi rounded-[calc(1rem-0.25rem)] bg-surface p-5">
                        <div className="mb-4">
                            <Field label={t('startFromTemplate')}>
                                <TemplateCombobox
                                    value={template}
                                    onChange={setTemplate}
                                    onBrowse={() => setBrowseOpen(true)}
                                />
                            </Field>
                            <p className="mt-1.5 text-xs text-text-faint">
                                {template ? t('templatePrefill') : t('blankSession')}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-end gap-4">
                            <div className="w-44">
                                <Field label={t('date')} htmlFor="performedAt">
                                    <Input
                                        id="performedAt"
                                        name="performedAt"
                                        type="date"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                    />
                                </Field>
                            </div>
                            <div className="min-w-[12rem] flex-1">
                                <Field label={t('notesOptional')} htmlFor="notes">
                                    <Input
                                        id="notes"
                                        name="notes"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder={t('notesPlaceholder')}
                                    />
                                </Field>
                            </div>
                        </div>

                        <FormError error={createError} className="mt-3" />

                        <div className="mt-4 flex items-center gap-2">
                            <TrackedButton
                                analyticsId="session-create-submit"
                                type="submit"
                                disabled={create.isPending || startFromTemplate.isPending}
                                className="inline-flex items-center gap-2 rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98] disabled:opacity-60"
                            >
                                {create.isPending || startFromTemplate.isPending
                                    ? t('creating')
                                    : template
                                      ? t('createFromTemplate')
                                      : t('createSession')}
                            </TrackedButton>
                            <TrackedButton
                                analyticsId="session-create-cancel"
                                type="button"
                                onClick={() => {
                                    setCreating(false)
                                    setTemplate(null)
                                }}
                                className="rounded-full px-4 py-2.5 text-sm text-text-dim transition-colors duration-300 hover:text-text"
                            >
                                {t('cancel')}
                            </TrackedButton>
                        </div>
                    </div>

                    <TemplateBrowseModal
                        open={browseOpen}
                        onClose={() => setBrowseOpen(false)}
                        onSelect={(t) => {
                            setTemplate(t)
                            setBrowseOpen(false)
                        }}
                    />
                </form>
            ) : null}

            {!isLoading ? (
                <PeriodNavigator
                    mode={periodMode}
                    onMode={(m) => {
                        setPeriodMode(m)
                        setPeriodOffset(0)
                    }}
                    onPrev={() => setPeriodOffset((o) => o - 1)}
                    onNext={() => setPeriodOffset((o) => o + 1)}
                    onCurrent={() => setPeriodOffset(0)}
                    label={windowLabel()}
                    isCurrent={periodOffset === 0}
                    from={from}
                    to={to}
                    onFrom={setFrom}
                    onTo={setTo}
                />
            ) : null}

            {showFilters ? (
                <FilterBar
                    exercises={exercises ?? []}
                    status={status}
                    onStatus={setStatus}
                    exerciseId={exerciseId}
                    onExercise={setExerciseId}
                    queryInput={queryInput}
                    onQuery={setQueryInput}
                    hasActiveFilters={hasActiveFilters}
                    onClear={clearFilters}
                />
            ) : null}

            <div
                className={cn('mt-10 transition-opacity duration-200', isFiltering && 'pointer-events-none opacity-50')}
            >
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-20 rounded-2xl" />
                        ))}
                    </div>
                ) : isError ? (
                    <p className="text-body text-ember">{t('historyError')}</p>
                ) : items.length === 0 ? (
                    hasActiveFilters ? (
                        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
                            <div className="inset-hi flex flex-col items-start rounded-[calc(2rem-0.375rem)] bg-surface p-8">
                                <span className="grid size-12 place-items-center rounded-2xl bg-white/[0.05] text-text-dim ring-1 ring-hairline">
                                    <Search className="size-6" />
                                </span>
                                <h2 className="mt-5 font-display text-h3">{t('noMatching')}</h2>
                                <p className="mt-2 max-w-sm text-body text-text-dim">{t('noMatchingBody')}</p>
                                <TrackedButton
                                    analyticsId="workouts-empty-clear-filters"
                                    type="button"
                                    onClick={clearFilters}
                                    className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                                >
                                    {t('clearFilters')}
                                </TrackedButton>
                            </div>
                        </div>
                    ) : hasDateWindow ? (
                        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
                            <div className="inset-hi flex flex-col items-start rounded-[calc(2rem-0.375rem)] bg-surface p-8">
                                <span className="grid size-12 place-items-center rounded-2xl bg-white/[0.05] text-text-dim ring-1 ring-hairline">
                                    <Calendar className="size-6" />
                                </span>
                                <h2 className="mt-5 font-display text-h3">{t('noSessionsInRange')}</h2>
                                <p className="mt-2 max-w-sm text-body text-text-dim">{t('noSessionsInRangeBody')}</p>
                                <TrackedButton
                                    analyticsId="workouts-empty-view-all"
                                    type="button"
                                    onClick={() => {
                                        setPeriodMode('all')
                                        setPeriodOffset(0)
                                    }}
                                    className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                                >
                                    {t('viewAll')}
                                </TrackedButton>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
                            <div className="inset-hi flex flex-col items-start rounded-[calc(2rem-0.375rem)] bg-surface p-8">
                                <span className="grid size-12 place-items-center rounded-2xl bg-white/[0.05] text-text-dim ring-1 ring-hairline">
                                    <Calendar className="size-6" />
                                </span>
                                <h2 className="mt-5 font-display text-h3">{t('noSessionsYet')}</h2>
                                <p className="mt-2 max-w-sm text-body text-text-dim">{t('noSessionsBody')}</p>
                                <TrackedButton
                                    analyticsId="session-create-first"
                                    type="button"
                                    onClick={() => setCreating(true)}
                                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98]"
                                >
                                    <Plus className="size-4" />
                                    {t('startFirst')}
                                </TrackedButton>
                            </div>
                        </div>
                    )
                ) : (
                    <>
                        <ul className="space-y-3">
                            {items.map((session) => (
                                <li key={session.id}>
                                    <SessionRow
                                        session={session}
                                        units={units}
                                        nameById={nameById}
                                        onEdit={() => setEditing(session)}
                                        onDelete={() => {
                                            setDeleteError(null)
                                            setDeleting(session)
                                        }}
                                    />
                                </li>
                            ))}
                        </ul>
                        {hasNextPage ? (
                            <TrackedButton
                                analyticsId="workouts-load-more"
                                type="button"
                                onClick={() => void fetchNextPage()}
                                disabled={isFetchingNextPage}
                                className="mt-6 inline-flex w-max rounded-full px-5 py-2.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text disabled:opacity-60"
                            >
                                {isFetchingNextPage ? t('loading') : t('loadMore')}
                            </TrackedButton>
                        ) : null}
                    </>
                )}
            </div>

            {editing ? <EditSessionModal key={editing.id} session={editing} onClose={() => setEditing(null)} /> : null}

            <ConfirmModal
                analyticsId="session-delete"
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={onConfirmDelete}
                title={t('deleteTitle')}
                description={t('deleteBody')}
                confirmLabel={t('deleteConfirm')}
                destructive
                pending={del.isPending}
                error={deleteError}
            />
        </div>
    )
}
