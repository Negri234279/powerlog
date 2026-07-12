'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import { track } from '@/lib/analytics/events'
import { cn } from '@/lib/cn'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import {
    type MicrocycleData,
    useGenerateMesocycleWeek,
    useMesocycle,
    useSetMesocycleStatus,
} from '@/lib/graphql/hooks/use-mesocycles'
import { MesocycleBuilder } from '@/components/workouts/mesocycle-builder'
import { FormError } from '@/components/ui/form-error'
import { Calendar, Check, Plus } from '@/components/ui/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'
import type { BackLink } from '@/components/workouts/back-link'

const STATUSES = ['draft', 'active', 'completed', 'archived'] as const

function formatDate(iso: string, locale: string): string {
    return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * A training block: status, weeks, week generation. Shared by
 * `/workouts/mesocycles/[id]` and `/coaching/athletes/[id]/mesocycles/[mesocycleId]`
 * — same block, same permissions (the API decides), only "back" differs.
 *
 * `sessionsHref` is where the generated sessions can be seen. The coach's nested
 * route omits it: that's exactly where its "back" already goes.
 */
export function MesocycleOverview({
    mesocycleId,
    back,
    sessionsHref,
}: {
    mesocycleId: string
    back: BackLink
    sessionsHref?: string
}) {
    const t = useTranslations('mesocycles')
    const locale = useLocale()
    const errorMessage = useErrorMessage()

    const [mode, setMode] = useState<'overview' | 'edit'>('overview')
    const { data: me } = useMe()
    const { data: mesocycle, isLoading, isError } = useMesocycle(mesocycleId)
    const setStatus = useSetMesocycleStatus()
    const generate = useGenerateMesocycleWeek()

    const [generatingWeek, setGeneratingWeek] = useState<number | null>(null)
    const [generateError, setGenerateError] = useState<string | null>(null)

    if (mode === 'edit') {
        return (
            <MesocycleBuilder
                mesocycleId={mesocycleId}
                onClose={() => setMode('overview')}
                onSaved={() => setMode('overview')}
            />
        )
    }

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-10 w-64 rounded-2xl" />
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-2xl" />
                ))}
            </div>
        )
    }

    if (isError || !mesocycle) {
        return <p className="text-body text-ember">{t('loadError')}</p>
    }

    const generated = new Set(mesocycle.generatedWeeks)
    const hasStartDate = mesocycle.startDate !== null
    // A coach-planned block belongs to the athlete but is the coach's to edit.
    const coachId = mesocycle.plannedByUserId
    const canManage = coachId !== null ? coachId === me?.id : mesocycle.ownerId === me?.id
    const isAthletesBlock = coachId !== null && mesocycle.ownerId !== me?.id

    function onGenerate(week: number, replace: boolean) {
        setGenerateError(null)
        setGeneratingWeek(week)
        generate.mutate(
            { mesocycleId, week, replace },
            {
                onSuccess: () => {
                    track('mesocycle_week_generated', {})
                    setGeneratingWeek(null)
                },
                onError: (err) => {
                    setGenerateError(errorMessage(err))
                    setGeneratingWeek(null)
                },
            },
        )
    }

    return (
        <div>
            <TrackedLink
                analyticsId={back.analyticsId}
                href={back.href}
                className="font-mono text-eyebrow uppercase text-text-faint transition-colors duration-300 hover:text-text-dim"
            >
                {back.label}
            </TrackedLink>

            <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                    <h1 className="font-display text-display tracking-tight">{mesocycle.name}</h1>
                    <p className="mt-1 text-sm text-text-dim">
                        {mesocycle.goal ? `${mesocycle.goal} · ` : ''}
                        {hasStartDate
                            ? t('startsOn', { date: formatDate(mesocycle.startDate!, locale) })
                            : t('noStartDate')}
                    </p>
                </div>
                {canManage ? (
                    <TrackedButton
                        analyticsId="mesocycle-edit-open"
                        type="button"
                        onClick={() => setMode('edit')}
                        className="rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                    >
                        {t('editPlan')}
                    </TrackedButton>
                ) : null}
            </div>

            {!canManage ? (
                <p className="mt-4 rounded-2xl bg-bg/40 px-4 py-3 text-sm text-text-dim ring-1 ring-hairline">
                    {t('coachManaged')}
                </p>
            ) : null}
            {isAthletesBlock ? (
                <p className="mt-4 rounded-2xl bg-bg/40 px-4 py-3 text-sm text-text-dim ring-1 ring-hairline">
                    {t('planningForAthlete')}
                </p>
            ) : null}

            {/* Status control */}
            <div className={cn('mt-5 flex flex-wrap items-center gap-3', !canManage && 'hidden')}>
                <span className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                    {t('statusLabel')}
                </span>
                <div className="inline-flex rounded-full bg-bg/60 p-1 ring-1 ring-hairline">
                    {STATUSES.map((status) => (
                        <TrackedButton
                            analyticsId="mesocycle-set-status"
                            key={status}
                            type="button"
                            onClick={() =>
                                setStatus.mutate(
                                    { id: mesocycleId, status },
                                    { onSuccess: () => track('mesocycle_status_changed', { status }) },
                                )
                            }
                            disabled={setStatus.isPending}
                            className={cn(
                                'rounded-full px-3.5 py-1.5 text-sm transition-colors duration-300 disabled:opacity-60',
                                mesocycle.status === status
                                    ? 'bg-white/[0.08] text-text'
                                    : 'text-text-dim hover:text-text',
                            )}
                        >
                            {t(`status.${status}`)}
                        </TrackedButton>
                    ))}
                </div>
            </div>

            {!hasStartDate ? <p className="mt-4 text-sm text-text-faint">{t('setStartDateHint')}</p> : null}

            <FormError error={generateError} className="mt-4" />

            <div className="mt-6 space-y-3">
                {mesocycle.microcycles.map((week) => (
                    <WeekRow
                        key={week.id}
                        week={week}
                        isGenerated={generated.has(week.weekIndex)}
                        canGenerate={hasStartDate}
                        busy={generate.isPending && generatingWeek === week.weekIndex}
                        canManage={canManage}
                        onGenerate={(replace) => onGenerate(week.weekIndex, replace)}
                    />
                ))}
            </div>

            {sessionsHref ? (
                <TrackedLink
                    analyticsId="mesocycle-view-in-workouts"
                    href={sessionsHref}
                    className="mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                >
                    <Calendar className="size-4" /> {t('viewInWorkouts')}
                </TrackedLink>
            ) : null}
        </div>
    )
}

function WeekRow({
    week,
    isGenerated,
    canGenerate,
    canManage,
    busy,
    onGenerate,
}: {
    week: MicrocycleData
    isGenerated: boolean
    canGenerate: boolean
    canManage: boolean
    busy: boolean
    onGenerate: (replace: boolean) => void
}) {
    const t = useTranslations('mesocycles')
    return (
        <div className="rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi flex flex-wrap items-center justify-between gap-3 rounded-[calc(1rem-0.25rem)] bg-surface p-5">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-display text-lg tracking-tight">{t('week', { n: week.weekIndex })}</span>
                        {week.label ? <span className="text-sm text-text-dim">{week.label}</span> : null}
                        {isGenerated ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-pr/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-pr">
                                <Check className="size-3" /> {t('generated')}
                            </span>
                        ) : null}
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-text-faint">
                        {t('daysCount', { count: week.days.length })}
                    </p>
                </div>

                <div className={cn('flex items-center gap-2', !canManage && 'hidden')}>
                    {isGenerated ? (
                        <TrackedButton
                            analyticsId="mesocycle-regenerate-week"
                            type="button"
                            onClick={() => onGenerate(true)}
                            disabled={busy || !canGenerate}
                            className="rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text disabled:opacity-60"
                        >
                            {busy ? t('generating') : t('regenerateWeek')}
                        </TrackedButton>
                    ) : (
                        <TrackedButton
                            analyticsId="mesocycle-generate-week"
                            type="button"
                            onClick={() => onGenerate(false)}
                            disabled={busy || !canGenerate}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-sm font-medium text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1] disabled:opacity-60"
                        >
                            <Plus className="size-3.5" /> {busy ? t('generating') : t('generateWeek')}
                        </TrackedButton>
                    )}
                </div>
            </div>
        </div>
    )
}
