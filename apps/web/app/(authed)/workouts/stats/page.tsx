'use client'

import Link from 'next/link'
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

type RangeKey = 'all' | '30d' | '90d' | '1y'

const RANGES: ReadonlyArray<{ key: RangeKey; label: string; days: number | null }> = [
    { key: 'all', label: 'All time', days: null },
    { key: '30d', label: '30 days', days: 30 },
    { key: '90d', label: '90 days', days: 90 },
    { key: '1y', label: '1 year', days: 365 },
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
    return (
        <SlidingTabs
            items={RANGES.map((r) => ({ value: r.key, label: r.label }))}
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
            <Link
                href="/workouts"
                className="font-mono text-eyebrow uppercase text-text-faint transition-colors duration-300 hover:text-text-dim"
            >
                ← Workouts
            </Link>

            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <TextsReveal>
                    <h1 className="font-display text-display">Analytics</h1>
                    <p className="mt-3 max-w-lg text-body text-text-dim">
                        Strength, volume and balance from your logged sets. Estimated 1RM uses the Epley formula.
                    </p>
                </TextsReveal>
                <RangeToggle range={range} onChange={setRange} />
            </div>

            {isEmpty ? (
                <div className="mt-10 rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
                    <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-8">
                        <h2 className="font-display text-h3">Nothing to chart yet</h2>
                        <p className="mt-2 max-w-sm text-body text-text-dim">
                            No logged sets in this range. Log some sets and your dashboard fills in here.
                        </p>
                        <Link
                            href="/workouts"
                            className="mt-6 inline-flex items-center gap-2 rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98]"
                        >
                            Go to workouts
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="mt-8 space-y-6">
                    {/* 1 — KPIs */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        <KpiTile
                            label="Est. total (S+B+D)"
                            value={formatWeight(summary?.estimatedTotalKg, units)}
                            sub={
                                summary
                                    ? `SQ ${formatWeight(summary.bestSquatE1rmKg, units)} · BN ${formatWeight(summary.bestBenchE1rmKg, units)} · DL ${formatWeight(summary.bestDeadliftE1rmKg, units)}`
                                    : undefined
                            }
                            accent
                        />
                        <KpiTile label="Volume" value={formatWeight(summary?.totalVolumeKg ?? 0, units)} />
                        <KpiTile label="Sessions" value={String(summary?.sessions ?? 0)} />
                        <KpiTile label="Training days" value={String(summary?.trainingDays ?? 0)} />
                        <KpiTile label="Sets" value={String(summary?.totalSets ?? 0)} />
                        <KpiTile label="Reps" value={String(summary?.totalReps ?? 0)} />
                        <KpiTile label="Avg RPE" value={summary?.avgRpe != null ? summary.avgRpe.toFixed(1) : '—'} />
                        <KpiTile label="Exercises" value={String(summary?.distinctExercises ?? 0)} />
                    </div>

                    {/* 2 — Strength progression + projection */}
                    <SectionCard
                        title="Strength progression"
                        subtitle="Best e1RM per session, with a linear trend and 4/8/12-week projection."
                        action={
                            <select
                                value={liftId}
                                onChange={(e) => setLiftId(e.target.value)}
                                aria-label="Exercise"
                                className="appearance-none rounded-full bg-bg/60 px-4 py-2 text-sm text-text ring-1 ring-hairline outline-none focus:ring-ember/50"
                            >
                                {liftGroups.map(([category, items]) => (
                                    <optgroup key={category} label={category}>
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
                            <p className="text-sm text-text-dim">No e1RM data for this exercise in range.</p>
                        ) : (
                            <>
                                <StrengthTrendChart
                                    points={progression.points}
                                    trend={progression.trend ?? null}
                                    formatValue={formatValue}
                                />
                                {progression.trend ? (
                                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                                        <span className="text-text-dim">
                                            Trend{' '}
                                            <span
                                                className={cn(
                                                    'font-mono tabular-nums',
                                                    progression.trend.slopePerWeekKg >= 0 ? 'text-pr' : 'text-ember',
                                                )}
                                            >
                                                {progression.trend.slopePerWeekKg >= 0 ? '+' : ''}
                                                {formatValue(progression.trend.slopePerWeekKg)}/wk
                                            </span>
                                        </span>
                                        <span className="text-text-dim">
                                            Fit{' '}
                                            <span className="font-mono text-text">
                                                R² {progression.trend.r2.toFixed(2)}
                                            </span>
                                        </span>
                                        {progression.trend.projections.map((p) => (
                                            <span key={p.weeks} className="text-text-dim">
                                                +{p.weeks}wk{' '}
                                                <span className="font-mono tabular-nums text-amber">
                                                    {formatValue(p.e1rmKg)}
                                                </span>
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-4 text-sm text-text-faint">
                                        Need at least two sessions to project a trend.
                                    </p>
                                )}
                            </>
                        )}
                    </SectionCard>

                    {/* 3 — Weekly volume */}
                    <SectionCard title="Weekly volume" subtitle="Tonnage per week (Σ weight·reps over logged sets).">
                        {volume && volume.length > 0 ? (
                            <WeeklyVolumeChart data={volume} formatValue={formatValue} />
                        ) : (
                            <p className="text-sm text-text-dim">No volume in this range.</p>
                        )}
                    </SectionCard>

                    {/* 4 — Distribution + intensity */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <SectionCard title="Volume by muscle" subtitle="Where your training emphasis lands.">
                            {distribution && distribution.byMuscle.length > 0 ? (
                                <DistributionChart data={distribution.byMuscle} formatValue={formatValue} />
                            ) : (
                                <p className="text-sm text-text-dim">No data in this range.</p>
                            )}
                        </SectionCard>
                        <SectionCard title="Volume by movement" subtitle="Balance across movement categories.">
                            {distribution && distribution.byCategory.length > 0 ? (
                                <DistributionChart data={distribution.byCategory} formatValue={formatValue} />
                            ) : (
                                <p className="text-sm text-text-dim">No data in this range.</p>
                            )}
                        </SectionCard>
                    </div>

                    <SectionCard
                        title="Intensity"
                        subtitle={
                            intensityMetric === 'rpe'
                                ? 'Sets by RPE — hard work (≥8) glows ember.'
                                : 'Sets by reps in reserve — close to failure (≤2) glows ember.'
                        }
                        action={
                            <div className="inline-flex rounded-full bg-bg/60 p-1 ring-1 ring-hairline">
                                {(['rpe', 'rir'] as const).map((m) => (
                                    <button
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
                                    </button>
                                ))}
                            </div>
                        }
                    >
                        {distribution && distribution[intensityMetric].length > 0 ? (
                            <IntensityChart
                                data={distribution[intensityMetric]}
                                label={intensityMetric.toUpperCase()}
                                intense={(v) => (intensityMetric === 'rpe' ? v >= 8 : v <= 2)}
                            />
                        ) : (
                            <p className="text-sm text-text-dim">
                                No {intensityMetric.toUpperCase()} recorded in this range.
                            </p>
                        )}
                    </SectionCard>

                    {/* 5 — Per-exercise table */}
                    <SectionCard
                        title="By exercise"
                        subtitle={prev ? 'Δ compares e1RM with the previous period.' : 'Most-trained first.'}
                    >
                        {statsLoading ? (
                            <p className="text-sm text-text-dim">Crunching your numbers…</p>
                        ) : sortedStats.length === 0 ? (
                            <p className="text-sm text-text-dim">No logged sets in this range.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[44rem] text-sm">
                                    <thead>
                                        <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-widest text-text-faint">
                                            <th className="py-3 pr-4 text-left font-normal">Exercise</th>
                                            <th className="px-4 py-3 text-right font-normal">Volume</th>
                                            <th className="px-4 py-3 text-right font-normal">Best e1RM</th>
                                            {prev ? <th className="px-4 py-3 text-right font-normal">Δ</th> : null}
                                            <th className="px-4 py-3 text-right font-normal">Heaviest</th>
                                            <th className="px-4 py-3 text-right font-normal">Sets</th>
                                            <th className="py-3 pl-4 text-right font-normal">Reps</th>
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
                                                            {row.category}
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
