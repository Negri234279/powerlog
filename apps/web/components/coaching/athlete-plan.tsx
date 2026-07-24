'use client'

import { useLocale, useTranslations } from 'next-intl'
import { type SubmitEvent, useState } from 'react'

import { useAssignMesocycle, useAthleteMesocycles } from '@/lib/graphql/hooks/use-athlete'
import { useMesocycles } from '@/lib/graphql/hooks/use-mesocycles'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { todayLocalIso } from '@/lib/format-date'
import { PlanSessionForm } from '@/components/coaching/plan-session-form'
import { FormError } from '@/components/ui/form-error'
import { Field, Input, Select } from '@/components/ui/field'
import { Calendar, Dumbbell } from '@/components/ui/icons'
import { QueryError } from '@/components/ui/query-error'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl bg-bg/40 p-5 ring-1 ring-hairline">
            <h3 className="font-display text-lg tracking-tight">{title}</h3>
            <p className="mt-1 text-sm text-text-dim">{subtitle}</p>
            <div className="mt-4">{children}</div>
        </div>
    )
}

function GroupLabel({ children }: { children: React.ReactNode }) {
    return <p className="font-mono text-[10px] uppercase tracking-widest text-text-faint">{children}</p>
}

/** Plan a session for the athlete — blank, or materialized from one of the coach's templates. */
function PlanSessionCard({ athleteId }: { athleteId: string }) {
    const t = useTranslations('coaching')

    return (
        <Card title={t('planSessionTitle')} subtitle={t('planSessionSubtitle')}>
            <PlanSessionForm athleteId={athleteId} analyticsId="athlete-plan-session" />
        </Card>
    )
}

/** The blocks the athlete already has — the state this section is about. */
function AthleteBlockList({ athleteId }: { athleteId: string }) {
    const t = useTranslations('coaching')
    const tm = useTranslations('mesocycles')
    const locale = useLocale()
    const blocks = useAthleteMesocycles(athleteId)

    if (blocks.isPending) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
            </div>
        )
    }

    if (blocks.isError) {
        return (
            <QueryError
                message={t('blocksLoadError')}
                onRetry={() => void blocks.refetch()}
                analyticsId="athlete-blocks-retry"
            />
        )
    }

    if (blocks.data.length === 0) {
        return <p className="text-sm text-text-faint">{t('noAthleteBlocks')}</p>
    }

    return (
        <div className="space-y-2">
            {blocks.data.map((block) => (
                <div
                    key={block.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 ring-1 ring-hairline"
                >
                    <div className="min-w-0">
                        <p className="truncate text-text">{block.name}</p>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-text-faint">
                            {tm(`status.${block.status}`)} ·{' '}
                            {block.startDate
                                ? new Date(block.startDate).toLocaleDateString(locale, {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                  })
                                : tm('noStartDate')}
                        </p>
                    </div>
                    <TrackedLink
                        analyticsId="athlete-block-open"
                        href={`/coaching/athletes/${athleteId}/mesocycles/${block.id}`}
                        className="shrink-0 rounded-full px-4 py-1.5 text-xs text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                    >
                        {t('openBlock')}
                    </TrackedLink>
                </div>
            ))}
        </div>
    )
}

/** Copy one of the coach's own blocks into the athlete's library. */
function AssignBlockForm({ athleteId }: { athleteId: string }) {
    const t = useTranslations('coaching')
    const errorMessage = useErrorMessage()

    const { data: mine, isPending } = useMesocycles()
    const assign = useAssignMesocycle()

    const [mesocycleId, setMesocycleId] = useState('')
    const [startDate, setStartDate] = useState(todayLocalIso())
    const [error, setError] = useState<string | null>(null)
    const [assigned, setAssigned] = useState<string | null>(null)

    function onSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        if (mesocycleId === '') return

        setError(null)
        setAssigned(null)
        assign.mutate(
            { athleteId, mesocycleId, startDate },
            {
                onSuccess: (data) => {
                    setAssigned(data.assignMesocycleToAthlete.name)
                    setMesocycleId('')
                },
                onError: (err) => setError(errorMessage(err)),
            },
        )
    }

    // Still loading is not the same as owning none: the old code read an empty
    // `mine` during the fetch and told the coach they had no mesocycles at all,
    // CTA included, while their library was on its way.
    if (isPending) {
        return <Skeleton className="h-24 rounded-2xl" />
    }

    // Blocks a coach already handed to someone are copies; only offer their own.
    const own = (mine ?? []).filter((mesocycle) => mesocycle.plannedByUserId === null)

    if (own.length === 0) {
        return (
            <div>
                <p className="text-sm text-text-faint">{t('noBlocksYet')}</p>
                <TrackedLink
                    analyticsId="athlete-plan-build-block"
                    href="/workouts/mesocycles"
                    className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                >
                    <Dumbbell className="size-4" /> {t('buildBlock')}
                </TrackedLink>
            </div>
        )
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('assignBlock')}>
                    <Select value={mesocycleId} onChange={(e) => setMesocycleId(e.target.value)}>
                        <option value="">{t('assignBlockPlaceholder')}</option>
                        {own.map((mesocycle) => (
                            <option key={mesocycle.id} value={mesocycle.id}>
                                {mesocycle.name}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label={t('assignStartDate')}>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </Field>
            </div>

            {assigned ? <p className="text-sm text-pr">{t('assigned', { name: assigned })}</p> : null}
            <FormError error={error} />

            <TrackedButton
                analyticsId="athlete-assign-block"
                type="submit"
                disabled={assign.isPending || mesocycleId === ''}
                className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1] disabled:opacity-50"
            >
                <Calendar className="size-4" />
                {assign.isPending ? t('assigning') : t('assign')}
            </TrackedButton>
        </form>
    )
}

/**
 * Everything about the athlete's blocks in one place: the ones they already have
 * first, then the two ways to give them another. Both actions produce the same
 * kind of thing, so they belong beside the list they change — reading the state
 * before adding to it is also what stops a coach assigning a second block on top
 * of a running one.
 */
function AthleteBlocksCard({ athleteId }: { athleteId: string }) {
    const t = useTranslations('coaching')

    return (
        <Card title={t('athleteBlocksTitle')} subtitle={t('athleteBlocksSubtitle')}>
            <AthleteBlockList athleteId={athleteId} />

            <div className="mt-5 space-y-5 border-t border-hairline pt-5">
                <div>
                    <GroupLabel>{t('buildBlockTitle')}</GroupLabel>
                    <p className="mt-1 text-sm text-text-dim">{t('buildBlockSubtitle')}</p>
                    <TrackedLink
                        analyticsId="athlete-build-block"
                        href={`/coaching/athletes/${athleteId}/mesocycles/new`}
                        className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-5 py-2.5 text-sm font-medium text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1]"
                    >
                        <Dumbbell className="size-4" /> {t('buildBlockFor')}
                    </TrackedLink>
                </div>

                <div>
                    <GroupLabel>{t('assignBlockTitle')}</GroupLabel>
                    <p className="mt-1 mb-3 text-sm text-text-dim">{t('assignBlockSubtitle')}</p>
                    <AssignBlockForm athleteId={athleteId} />
                </div>
            </div>
        </Card>
    )
}

/** Everything the coach can put on the athlete's calendar. */
export function AthletePlan({ athleteId }: { athleteId: string }) {
    return (
        <div className="space-y-4">
            <AthleteBlocksCard athleteId={athleteId} />
            <PlanSessionCard athleteId={athleteId} />
        </div>
    )
}
