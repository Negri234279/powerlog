'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/cn'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import {
    useExerciseStats,
    useStrengthProgression,
    useTrainingDistribution,
    useTrainingSummary,
    useVolumeSeries,
} from '@/lib/graphql/hooks/use-workouts'
import { formatWeight, unitsOf } from '@/lib/units'
import { DistributionChart, IntensityChart, StrengthTrendChart, WeeklyVolumeChart } from '@/components/charts'
import { PopNumber } from '@/components/ui/pop-number'
import { Skeleton } from '@/components/ui/skeleton'
import { SlidingTabs } from '@/components/ui/sliding-tabs'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { TiltCard } from '@/components/ui/tilt-card'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

type RangeKey = 'all' | '30d' | '90d' | '1y'

const RANGES: ReadonlyArray<{ key: RangeKey; labelKey: string; days: number | null }> = [
    { key: 'all', labelKey: 'rangeAll', days: null },
    { key: '30d', labelKey: 'range30', days: 30 },
    { key: '90d', labelKey: 'range90', days: 90 },
    { key: '1y', labelKey: 'range1y', days: 365 },
]

function isoDaysAgo(days: number): string {
    const date = new Date()
    date.setDate(date.getDate() - days)
    return date.toISOString()
}

// ── small building blocks ────────────────────────────────────

function SectionCard({
    title,
    subtitle,
    action,
    children,
}: {
    title: string
    subtitle?: string
    action?: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="font-display text-h3">{title}</h2>
                        {subtitle ? <p className="mt-1 text-sm text-text-dim">{subtitle}</p> : null}
                    </div>
                    {action}
                </div>
                {children}
            </div>
        </div>
    )
}

function KpiTile({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
    return (
        <TiltCard cardClassName="h-full rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi h-full rounded-[calc(1rem-0.25rem)] bg-surface px-5 py-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-text-faint">{label}</p>
                <p className={cn('mt-2 font-display tabular-nums', accent ? 'text-h2 text-gradient-ember' : 'text-h3')}>
                    <PopNumber value={value} />
                </p>
                {sub ? <p className="mt-1 text-xs text-text-dim">{sub}</p> : null}
            </div>
        </TiltCard>
    )
}

function RangeToggle({ range, onChange }: { range: RangeKey; onChange: (range: RangeKey) => void }) {
    const t = useTranslations('stats')
    return (
        <SlidingTabs
            analyticsId="stats-range"
            items={RANGES.map((r) => ({ value: r.key, label: t(r.labelKey) }))}
            value={range}
            onChange={(value) => onChange(value as RangeKey)}
        />
    )
}

function DeltaArrow({ delta, units }: { delta: number; units: ReturnType<typeof unitsOf> }) {
    if (Math.abs(delta) < 0.01) return <span className="text-text-faint">—</span>
    const up = delta > 0
    return (
        <span className={cn('inline-flex items-center gap-1 tabular-nums', up ? 'text-pr' : 'text-ember')}>
            {up ? '▲' : '▼'} {formatWeight(Math.abs(delta), units)}
        </span>
    )
}

// ── page ─────────────────────────────────────────────────────

export default function ExerciseStatsPage() {
    const t = useTranslations('stats')
    const tw = useTranslations('workouts')
    const tt = useTranslations('taxonomy')
    const { data: me } = useMe()
    const units = unitsOf(me?.units)
    const [range, setRange] = useState<RangeKey>('all')
    const [liftId, setLiftId] = useState('')
    const [intensityMetric, setIntensityMetric] = useState<'rpe' | 'rir'>('rpe')

    const days = RANGES.find((r) => r.key === range)?.days ?? null
    const from = useMemo(() => (days === null ? undefined : isoDaysAgo(days)), [days])
    // Immediately-preceding window of the same length, for the table's deltas.
    const prev = useMemo(() => (days === null ? null : { from: isoDaysAgo(days * 2), to: isoDaysAgo(days) }), [days])

    const { data: summary, isLoading: summaryLoading } = useTrainingSummary(from)
    const { data: volume } = useVolumeSeries(from)
    const { data: distribution } = useTrainingDistribution(from)
    const { data: stats, isLoading: statsLoading } = useExerciseStats(from)
    const { data: prevStats } = useExerciseStats(prev?.from, prev?.to)
    const { data: progression, isLoading: progressionLoading } = useStrengthProgression(liftId || undefined, from)

    const formatValue = useMemo(() => (v: number) => formatWeight(v, units), [units])

    // Most-trained first — drives both the table and the lift picker.
    const sortedStats = useMemo(() => [...(stats ?? [])].sort((a, b) => b.totalVolumeKg - a.totalVolumeKg), [stats])

    // The lift picker only offers exercises actually performed in range, grouped
    // by category in volume order.
    const liftGroups = useMemo(() => {
        const byCategory = new Map<string, { exerciseId: string; name: string }[]>()

        for (const row of sortedStats) {
            const list = byCategory.get(row.category) ?? []
            list.push({ exerciseId: row.exerciseId, name: row.name })
            byCategory.set(row.category, list)
        }

        return [...byCategory.entries()]
    }, [sortedStats])

    // Default to a performed lift (prefer a competition lift), and re-pick when
    // the range no longer includes the current selection.
    useEffect(() => {
        if (!stats) return
        if (liftId && stats.some((s) => s.exerciseId === liftId)) return

        const order = ['squat', 'bench', 'deadlift']
        const competition = order.map((cat) => stats.find((s) => s.category === cat)).find(Boolean)
        const pick = competition ?? sortedStats[0]

        setLiftId(pick ? pick.exerciseId : '')
    }, [stats, sortedStats, liftId])

    const prevBest = useMemo(() => {
        const map = new Map<string, number>()

        for (const row of prevStats ?? []) if (row.bestE1rmKg !== null) map.set(row.exerciseId, row.bestE1rmKg)

        return map
    }, [prevStats])

    const isEmpty = !summaryLoading && (summary?.totalSets ?? 0) === 0

    return (
        <div className="max-w-6xl">
            <TrackedLink
                analyticsId="stats-breadcrumb-workouts"
                href="/workouts"
                className="font-mono text-eyebrow uppercase text-text-faint transition-colors duration-300 hover:text-text-dim"
            >
                {tw('breadcrumbWorkouts')}
            </TrackedLink>

            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <TextsReveal>
                    <h1 className="font-display text-display">{t('title')}</h1>
                    <p className="mt-3 max-w-lg text-body text-text-dim">{t('intro')}</p>
                </TextsReveal>
                <RangeToggle range={range} onChange={setRange} />
            </div>

            {isEmpty ? (
                <div className="mt-10 rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
                    <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-8">
                        <h2 className="font-display text-h3">{t('emptyTitle')}</h2>
                        <p className="mt-2 max-w-sm text-body text-text-dim">{t('emptyBody')}</p>
                        <TrackedLink
                            analyticsId="stats-empty-go-workouts"
                            href="/workouts"
                            className="mt-6 inline-flex items-center gap-2 rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98]"
                        >
                            {t('goToWorkouts')}
                        </TrackedLink>
                    </div>
                </div>
            ) : (
                <div className="mt-8 space-y-6">
                    {/* 1 — KPIs */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        <KpiTile
                            label={t('kpiEstTotal')}
                            value={formatWeight(summary?.estimatedTotalKg, units)}
                            sub={
                                summary
                                    ? `SQ ${formatWeight(summary.bestSquatE1rmKg, units)} · BN ${formatWeight(summary.bestBenchE1rmKg, units)} · DL ${formatWeight(summary.bestDeadliftE1rmKg, units)}`
                                    : undefined
                            }
                            accent
                        />
                        <KpiTile label={t('kpiVolume')} value={formatWeight(summary?.totalVolumeKg ?? 0, units)} />
                        <KpiTile label={t('kpiSessions')} value={String(summary?.sessions ?? 0)} />
                        <KpiTile label={t('kpiTrainingDays')} value={String(summary?.trainingDays ?? 0)} />
                        <KpiTile label={t('kpiSets')} value={String(summary?.totalSets ?? 0)} />
                        <KpiTile label={t('kpiReps')} value={String(summary?.totalReps ?? 0)} />
                        <KpiTile
                            label={t('kpiAvgRpe')}
                            value={summary?.avgRpe != null ? summary.avgRpe.toFixed(1) : '—'}
                        />
                        <KpiTile label={t('kpiExercises')} value={String(summary?.distinctExercises ?? 0)} />
                    </div>

                    {/* 2 — Strength progression + projection */}
                    <SectionCard
                        title={t('progressionTitle')}
                        subtitle={t('progressionSubtitle')}
                        action={
                            <select
                                value={liftId}
                                onChange={(e) => setLiftId(e.target.value)}
                                aria-label={t('exerciseAria')}
                                className="appearance-none rounded-full bg-bg/60 px-4 py-2 text-sm text-text ring-1 ring-hairline outline-none focus:ring-ember/50"
                            >
                                {liftGroups.map(([category, items]) => (
                                    <optgroup key={category} label={tt(`category.${category}`)}>
                                        {items.map((ex) => (
                                            <option key={ex.exerciseId} value={ex.exerciseId}>
                                                {ex.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        }
                    >
                        {progressionLoading ? (
                            <Skeleton className="h-56 w-full rounded-2xl" />
                        ) : !progression || progression.points.length === 0 ? (
                            <p className="text-sm text-text-dim">{t('noE1rm')}</p>
                        ) : (
                            <>
                                <StrengthTrendChart
                                    points={progression.points}
                                    trend={progression.trend ?? null}
                                    formatValue={formatValue}
                                    projectedLabel={t('seriesProjected')}
                                />
                                {progression.trend ? (
                                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                                        <span className="text-text-dim">
                                            {t('trend')}{' '}
                                            <span
                                                className={cn(
                                                    'font-mono tabular-nums',
                                                    progression.trend.slopePerWeekKg >= 0 ? 'text-pr' : 'text-ember',
                                                )}
                                            >
                                                {progression.trend.slopePerWeekKg >= 0 ? '+' : ''}
                                                {t('perWeek', { value: formatValue(progression.trend.slopePerWeekKg) })}
                                            </span>
                                        </span>
                                        <span className="text-text-dim">
                                            {t('fit')}{' '}
                                            <span className="font-mono text-text">
                                                R² {progression.trend.r2.toFixed(2)}
                                            </span>
                                        </span>
                                        {progression.trend.projections.map((p) => (
                                            <span key={p.weeks} className="text-text-dim">
                                                {t('projWeeks', { weeks: p.weeks })}{' '}
                                                <span className="font-mono tabular-nums text-amber">
                                                    {formatValue(p.e1rmKg)}
                                                </span>
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-4 text-sm text-text-faint">{t('needTwo')}</p>
                                )}
                            </>
                        )}
                    </SectionCard>

                    {/* 3 — Weekly volume */}
                    <SectionCard title={t('weeklyVolumeTitle')} subtitle={t('weeklyVolumeSubtitle')}>
                        {volume && volume.length > 0 ? (
                            <WeeklyVolumeChart
                                data={volume}
                                formatValue={formatValue}
                                seriesName={t('seriesVolume')}
                                weekOfLabel={(date) => t('weekOf', { date })}
                            />
                        ) : (
                            <p className="text-sm text-text-dim">{t('noVolume')}</p>
                        )}
                    </SectionCard>

                    {/* 4 — Distribution + intensity */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <SectionCard title={t('byMuscleTitle')} subtitle={t('byMuscleSubtitle')}>
                            {distribution && distribution.byMuscle.length > 0 ? (
                                <DistributionChart
                                    data={distribution.byMuscle}
                                    formatValue={formatValue}
                                    seriesName={t('seriesVolume')}
                                    labelFor={(key) => tt(`muscle.${key}`)}
                                />
                            ) : (
                                <p className="text-sm text-text-dim">{t('noData')}</p>
                            )}
                        </SectionCard>
                        <SectionCard title={t('byMovementTitle')} subtitle={t('byMovementSubtitle')}>
                            {distribution && distribution.byCategory.length > 0 ? (
                                <DistributionChart
                                    data={distribution.byCategory}
                                    formatValue={formatValue}
                                    seriesName={t('seriesVolume')}
                                    labelFor={(key) => tt(`category.${key}`)}
                                />
                            ) : (
                                <p className="text-sm text-text-dim">{t('noData')}</p>
                            )}
                        </SectionCard>
                    </div>

                    <SectionCard
                        title={t('intensityTitle')}
                        subtitle={intensityMetric === 'rpe' ? t('intensityRpeSubtitle') : t('intensityRirSubtitle')}
                        action={
                            <div className="inline-flex rounded-full bg-bg/60 p-1 ring-1 ring-hairline">
                                {(['rpe', 'rir'] as const).map((m) => (
                                    <TrackedButton
                                        analyticsId={`stats-intensity-${m}`}
                                        key={m}
                                        type="button"
                                        onClick={() => setIntensityMetric(m)}
                                        className={cn(
                                            'rounded-full px-4 py-1.5 text-sm uppercase transition-colors duration-300',
                                            intensityMetric === m
                                                ? 'bg-white/[0.08] text-text'
                                                : 'text-text-dim hover:text-text',
                                        )}
                                    >
                                        {m}
                                    </TrackedButton>
                                ))}
                            </div>
                        }
                    >
                        {distribution && distribution[intensityMetric].length > 0 ? (
                            <IntensityChart
                                data={distribution[intensityMetric]}
                                label={intensityMetric.toUpperCase()}
                                seriesName={t('seriesSets')}
                                intense={(v) => (intensityMetric === 'rpe' ? v >= 8 : v <= 2)}
                            />
                        ) : (
                            <p className="text-sm text-text-dim">
                                {t('noIntensity', { metric: intensityMetric.toUpperCase() })}
                            </p>
                        )}
                    </SectionCard>

                    {/* 5 — Per-exercise table */}
                    <SectionCard title={t('byExerciseTitle')} subtitle={prev ? t('deltaSubtitle') : t('mostTrained')}>
                        {statsLoading ? (
                            <p className="text-sm text-text-dim">{t('crunching')}</p>
                        ) : sortedStats.length === 0 ? (
                            <p className="text-sm text-text-dim">{t('noLogged')}</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[44rem] text-sm">
                                    <thead>
                                        <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-widest text-text-faint">
                                            <th className="py-3 pr-4 text-left font-normal">{t('colExercise')}</th>
                                            <th className="px-4 py-3 text-right font-normal">{t('colVolume')}</th>
                                            <th className="px-4 py-3 text-right font-normal">{t('colBestE1rm')}</th>
                                            {prev ? <th className="px-4 py-3 text-right font-normal">Δ</th> : null}
                                            <th className="px-4 py-3 text-right font-normal">{t('colHeaviest')}</th>
                                            <th className="px-4 py-3 text-right font-normal">{t('colSets')}</th>
                                            <th className="py-3 pl-4 text-right font-normal">{t('colReps')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-hairline">
                                        {sortedStats.map((row) => {
                                            const before = prevBest.get(row.exerciseId)
                                            return (
                                                <tr
                                                    key={row.exerciseId}
                                                    className="transition-colors duration-300 hover:bg-white/[0.02]"
                                                >
                                                    <td className="py-3 pr-4">
                                                        <span className="text-text">{row.name}</span>
                                                        <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-text-faint">
                                                            {tt(`category.${row.category}`)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono tabular-nums text-text">
                                                        {formatWeight(row.totalVolumeKg, units)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono tabular-nums text-pr">
                                                        {formatWeight(row.bestE1rmKg, units)}
                                                    </td>
                                                    {prev ? (
                                                        <td className="px-4 py-3 text-right font-mono text-xs">
                                                            {row.bestE1rmKg !== null && before !== undefined ? (
                                                                <DeltaArrow
                                                                    delta={row.bestE1rmKg - before}
                                                                    units={units}
                                                                />
                                                            ) : (
                                                                <span className="text-text-faint">—</span>
                                                            )}
                                                        </td>
                                                    ) : null}
                                                    <td className="px-4 py-3 text-right font-mono tabular-nums text-text-dim">
                                                        {formatWeight(row.heaviestWeightKg, units)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono tabular-nums text-text-dim">
                                                        {row.totalSets}
                                                    </td>
                                                    <td className="py-3 pl-4 text-right font-mono tabular-nums text-text-dim">
                                                        {row.totalReps}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </SectionCard>
                </div>
            )}
        </div>
    )
}
