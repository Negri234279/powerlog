'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import { track } from '@/lib/analytics/events'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { type MesocycleSummary, useDeleteMesocycle, useMesocycles } from '@/lib/graphql/hooks/use-mesocycles'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { MesocycleBuilder } from '@/components/workouts/mesocycle-builder'
import { ClearableSearch } from '@/components/ui/clearable-search'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Target, Plus } from '@/components/ui/icons'
import { Menu } from '@/components/ui/menu'
import { Skeleton } from '@/components/ui/skeleton'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

type View = { mode: 'list' } | { mode: 'new' }

function formatDate(iso: string, locale: string): string {
    return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatusChip({ status }: { status: string }) {
    const t = useTranslations('mesocycles')
    const active = status === 'active'
    const done = status === 'completed'
    return (
        <span
            className={
                active
                    ? 'rounded-full bg-ember/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-ember'
                    : done
                      ? 'rounded-full bg-pr/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-pr'
                      : 'rounded-full bg-white/[0.06] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest text-text-dim'
            }
        >
            {t(`status.${status}`)}
        </span>
    )
}

function MesocycleCard({ mesocycle, onDelete }: { mesocycle: MesocycleSummary; onDelete: () => void }) {
    const t = useTranslations('mesocycles')
    const tw = useTranslations('workouts')
    const locale = useLocale()
    return (
        <div className="rounded-2xl bg-shell p-1.5 ring-1 ring-hairline transition-all duration-300 hover:ring-text/20">
            <div className="inset-hi rounded-[calc(1rem-0.25rem)] bg-surface">
                <div className="relative">
                    <TrackedLink
                        analyticsId="mesocycle-open"
                        href={`/workouts/mesocycles/${mesocycle.id}`}
                        className="block p-5 pr-14"
                    >
                        <div className="flex items-center gap-3">
                            <h3 className="truncate font-display text-lg tracking-tight">{mesocycle.name}</h3>
                            <StatusChip status={mesocycle.status} />
                        </div>
                        {mesocycle.goal ? <p className="mt-0.5 text-sm text-text-dim">{mesocycle.goal}</p> : null}
                        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-text-faint">
                            {t('weeksDays', { weeks: mesocycle.weekCount, days: mesocycle.dayCount })} ·{' '}
                            {formatDate(mesocycle.updatedAt, locale)}
                        </p>
                    </TrackedLink>
                    <div className="absolute right-3 top-4">
                        <Menu
                            analyticsId="mesocycle-menu"
                            label={t('actions')}
                            items={[
                                {
                                    label: tw('delete'),
                                    onSelect: onDelete,
                                    destructive: true,
                                    analyticsId: 'mesocycle-menu-delete',
                                },
                            ]}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function MesocyclesPage() {
    const t = useTranslations('mesocycles')
    const tw = useTranslations('workouts')
    const errorMessage = useErrorMessage()
    const [view, setView] = useState<View>({ mode: 'list' })
    const [rawSearch, setRawSearch] = useState('')
    const search = useDebouncedValue(rawSearch.trim(), 300)

    const { data: mesocycles, isLoading } = useMesocycles(search || undefined)
    const del = useDeleteMesocycle()

    const [deleting, setDeleting] = useState<MesocycleSummary | null>(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    if (view.mode === 'new') {
        return (
            <MesocycleBuilder
                mesocycleId={null}
                onClose={() => setView({ mode: 'list' })}
                onSaved={() => setView({ mode: 'list' })}
            />
        )
    }

    function onConfirmDelete() {
        if (!deleting) return
        setDeleteError(null)
        del.mutate(deleting.id, {
            onSuccess: () => {
                track('mesocycle_deleted', {})
                setDeleting(null)
            },
            onError: (err) => setDeleteError(errorMessage(err)),
        })
    }

    const items = mesocycles ?? []
    const hasSearch = search !== ''

    return (
        <div>
            <TrackedLink
                analyticsId="mesocycles-breadcrumb-workouts"
                href="/workouts"
                className="font-mono text-eyebrow uppercase text-text-faint transition-colors duration-300 hover:text-text-dim"
            >
                {tw('breadcrumbWorkouts')}
            </TrackedLink>

            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <TextsReveal>
                    <p className="font-mono text-eyebrow uppercase text-text-faint">{tw('training')}</p>
                    <h1 className="mt-1 font-display text-display">{t('title')}</h1>
                </TextsReveal>
                <TrackedButton
                    analyticsId="mesocycle-new-open"
                    type="button"
                    onClick={() => setView({ mode: 'new' })}
                    className="inline-flex items-center gap-2 rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="size-4" /> {t('newMesocycle')}
                </TrackedButton>
            </div>

            {(items.length > 0 || hasSearch) && !isLoading ? (
                <div className="mt-6">
                    <ClearableSearch
                        analyticsId="mesocycles-search"
                        value={rawSearch}
                        onChange={setRawSearch}
                        placeholder={t('searchMesocycles')}
                        className="w-full sm:w-80"
                    />
                </div>
            ) : null}

            <div className="mt-6">
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-2xl" />
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
                        <div className="inset-hi flex flex-col items-start rounded-[calc(2rem-0.375rem)] bg-surface p-8">
                            <span className="grid size-12 place-items-center rounded-2xl bg-white/[0.05] text-text-dim ring-1 ring-hairline">
                                <Target className="size-6" />
                            </span>
                            <h2 className="mt-5 font-display text-h3">{hasSearch ? t('noMatching') : t('noneYet')}</h2>
                            <p className="mt-2 max-w-sm text-body text-text-dim">
                                {hasSearch ? t('tryDifferent') : t('emptyBody')}
                            </p>
                            {!hasSearch ? (
                                <TrackedButton
                                    analyticsId="mesocycle-create-first"
                                    type="button"
                                    onClick={() => setView({ mode: 'new' })}
                                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98]"
                                >
                                    <Plus className="size-4" /> {t('createFirst')}
                                </TrackedButton>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {items.map((mesocycle) => (
                            <li key={mesocycle.id}>
                                <MesocycleCard
                                    mesocycle={mesocycle}
                                    onDelete={() => {
                                        setDeleteError(null)
                                        setDeleting(mesocycle)
                                    }}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <ConfirmModal
                analyticsId="mesocycle-delete"
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={onConfirmDelete}
                title={t('deleteTitle')}
                description={deleting ? t('deleteBody', { name: deleting.name }) : undefined}
                confirmLabel={tw('deleteConfirm')}
                destructive
                pending={del.isPending}
                error={deleteError}
            />
        </div>
    )
}
