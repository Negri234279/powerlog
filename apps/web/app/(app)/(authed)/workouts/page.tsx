'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { type SubmitEvent, useMemo, useState } from 'react'

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
import { formatSessionDate, todayLocalIso } from '@/lib/format-date'
import { backParam } from '@/lib/workouts/back-param'
import { formatRange, groupByWeek } from '@/lib/workouts/period'
import { useHistoryFilters } from '@/lib/workouts/use-history-filters'
import { formatWeight, type Units, unitsOf } from '@/lib/units'
import { EditSessionModal } from '@/components/workouts/edit-session-modal'
import { HistoryFilterBar } from '@/components/workouts/history-filter-bar'
import { PeriodNavigator } from '@/components/workouts/period-navigator'
import { WeekHeading } from '@/components/workouts/week-heading'
import { type SelectedTemplate, TemplateBrowseModal, TemplateCombobox } from '@/components/workouts/template-select'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { UpgradeGate, isPlanRefusal } from '@/components/billing/upgrade-gate'
import { FormError } from '@/components/ui/form-error'
import { Skeleton } from '@/components/ui/skeleton'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { Field, Input, Select } from '@/components/ui/field'
import { Calendar, ChartLine, ChevronDown, Dumbbell, Plus, Search, Target } from '@/components/ui/icons'
import { Menu } from '@/components/ui/menu'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

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
    // Once actuals are logged, still surface the programmed target alongside them.
    const hasPlanned = set.plannedWeightKg !== null || set.plannedReps !== null

    return (
        <div className="flex items-center gap-3 text-sm tabular-nums">
            <span className="w-4 shrink-0 text-right font-mono text-xs text-text-faint">{set.order}</span>
            <span className="text-text">
                {weight !== null && reps !== null ? `${formatWeight(weight, units)} × ${reps}` : '—'}
                {!hasActual && weight !== null ? (
                    <span className="text-text-faint"> · {t('plannedSuffix')}</span>
                ) : null}
            </span>
            {hasActual && hasPlanned ? (
                <span className="font-mono text-xs text-text-faint">
                    {t('planPrefix')} {formatWeight(set.plannedWeightKg, units)} × {set.plannedReps ?? '—'}
                </span>
            ) : null}
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
    backQuery,
}: {
    session: WorkoutHistoryItem
    units: Units
    nameById: Map<string, string>
    onEdit: () => void
    onDelete: () => void
    backQuery: string
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
                        href={`/workouts/${session.id}${backParam(backQuery)}`}
                        className="flex flex-col gap-3 py-4 pl-12 pr-14 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="min-w-0">
                            <div className="flex items-center gap-3">
                                <span className="font-display text-lg tracking-tight">
                                    {formatSessionDate(session.performedAt, locale)}
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
    // Kept alongside the message so a plan refusal can render an upgrade CTA instead.
    const [createRawError, setCreateRawError] = useState<unknown>(null)
    const [creating, setCreating] = useState(false)
    const [date, setDate] = useState(todayLocalIso)
    const [notes, setNotes] = useState('')
    const [template, setTemplate] = useState<SelectedTemplate | null>(null)
    const [browseOpen, setBrowseOpen] = useState(false)
    const [editing, setEditing] = useState<WorkoutHistoryItem | null>(null)
    const [deleting, setDeleting] = useState<WorkoutHistoryItem | null>(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    const locale = useLocale()

    // Every filter lives in the shared hook, so this page and the coach's view of
    // an athlete filter identically (see lib/workouts/use-history-filters).
    const history = useHistoryFilters('week')

    // Resolve exercise names for the expandable session detail panels.
    const nameById = useMemo(() => {
        const map = new Map<string, string>()

        for (const exercise of exercises ?? []) map.set(exercise.id, exercise.name)

        return map
    }, [exercises])

    const { data, isLoading, isError, isPlaceholderData, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useWorkoutHistory(history.filters)

    const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data])
    const weeks = useMemo(() => groupByWeek(items, (session) => session.performedAt), [items])
    // A single week needs no dividers, and neither does the week view itself.
    const showWeeks = history.periodMode !== 'week' && weeks.length > 1
    const showFilters = !isLoading && (items.length > 0 || history.hasActiveFilters)
    // While a new filter combination loads, previous results stay visible
    // (keepPreviousData) — dim them slightly instead of flashing a loading state.
    const isFiltering = isPlaceholderData

    function renderSession(session: WorkoutHistoryItem) {
        return (
            <li key={session.id}>
                <SessionRow
                    session={session}
                    units={units}
                    nameById={nameById}
                    backQuery={history.queryString}
                    onEdit={() => setEditing(session)}
                    onDelete={() => {
                        setDeleteError(null)
                        setDeleting(session)
                    }}
                />
            </li>
        )
    }

    async function onCreate(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        setCreateError(null)
        setCreateRawError(null)
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
            setCreateRawError(error)
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
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <TrackedLink
                        analyticsId="workouts-templates-link"
                        href="/workouts/templates"
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                    >
                        <Dumbbell className="size-4" />
                        {t('templates')}
                    </TrackedLink>
                    <TrackedLink
                        analyticsId="workouts-mesocycles-link"
                        href="/workouts/mesocycles"
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                    >
                        <Target className="size-4" />
                        {t('mesocycles')}
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

                        {isPlanRefusal(createRawError) ? (
                            <div className="mt-3">
                                <UpgradeGate error={createRawError} />
                            </div>
                        ) : (
                            <FormError error={createError} className="mt-3" />
                        )}

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
                    analyticsPrefix="workouts"
                    className="mt-6"
                    mode={history.periodMode}
                    onMode={history.setPeriod}
                    onPrev={history.prevPeriod}
                    onNext={history.nextPeriod}
                    onCurrent={history.currentPeriod}
                    label={history.windowLabel()}
                    isCurrent={history.periodOffset === 0}
                    from={history.from}
                    to={history.to}
                    onFrom={history.setFrom}
                    onTo={history.setTo}
                />
            ) : null}

            {showFilters ? (
                <HistoryFilterBar
                    analyticsPrefix="workouts"
                    className="mt-6"
                    exercises={exercises ?? []}
                    status={history.status}
                    onStatus={history.setStatus}
                    exerciseId={history.exerciseId}
                    onExercise={history.setExerciseId}
                    queryInput={history.queryInput}
                    onQuery={history.setQueryInput}
                    hasActiveFilters={history.hasActiveFilters}
                    onClear={history.clear}
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
                    history.hasActiveFilters ? (
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
                                    onClick={history.clear}
                                    className="mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                                >
                                    {t('clearFilters')}
                                </TrackedButton>
                            </div>
                        </div>
                    ) : history.hasDateWindow ? (
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
                                    onClick={() => history.setPeriod('all')}
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
                        {showWeeks ? (
                            <div className="space-y-6">
                                {weeks.map((week) => (
                                    <section key={week.key} className="space-y-3">
                                        <WeekHeading
                                            label={formatRange('week', week.range, locale)}
                                            sessions={week.items.length}
                                            volumeKg={week.items.reduce((total, item) => total + item.totalVolumeKg, 0)}
                                            units={units}
                                        />
                                        <ul className="space-y-3">{week.items.map(renderSession)}</ul>
                                    </section>
                                ))}
                            </div>
                        ) : (
                            <ul className="space-y-3">{items.map(renderSession)}</ul>
                        )}
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
