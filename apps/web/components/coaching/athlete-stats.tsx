'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { cn } from '@/lib/cn'
import { useAthleteExerciseStats, useAthleteSummary } from '@/lib/graphql/hooks/use-athlete'
import { formatWeight, type Units } from '@/lib/units'
import { Skeleton } from '@/components/ui/skeleton'
import { SlidingTabs } from '@/components/ui/sliding-tabs'

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

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className="rounded-2xl bg-bg/40 px-5 py-4 ring-1 ring-hairline">
            <p className="font-mono text-[10px] uppercase tracking-widest text-text-faint">{label}</p>
            <p className={cn('mt-2 font-display tabular-nums', accent ? 'text-h3 text-gradient-ember' : 'text-h3')}>
                {value}
            </p>
        </div>
    )
}

/** The athlete's training KPIs and per-exercise breakdown, in the coach's units. */
export function AthleteStats({ athleteId, units }: { athleteId: string; units: Units }) {
    const t = useTranslations('coaching')
    const ts = useTranslations('stats')
    const [range, setRange] = useState<RangeKey>('90d')

    const days = RANGES.find((r) => r.key === range)?.days ?? null
    const from = days === null ? undefined : isoDaysAgo(days)

    const summary = useAthleteSummary(athleteId, from)
    const stats = useAthleteExerciseStats(athleteId, from)

    const rows = [...(stats.data ?? [])].sort((a, b) => b.totalVolumeKg - a.totalVolumeKg)

    return (
        <div className="space-y-6">
            <SlidingTabs
                analyticsId="athlete-stats-range"
                value={range}
                onChange={(value) => setRange(value as RangeKey)}
                items={RANGES.map((r) => ({ value: r.key, label: ts(r.labelKey) }))}
            />

            {summary.isLoading ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-2xl" />
                    ))}
                </div>
            ) : summary.data ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Kpi label={ts('kpiSessions')} value={String(summary.data.sessions)} />
                    <Kpi label={ts('kpiVolume')} value={formatWeight(summary.data.totalVolumeKg, units)} />
                    <Kpi label={ts('kpiSets')} value={String(summary.data.totalSets)} />
                    <Kpi
                        label={ts('kpiEstTotal')}
                        value={
                            summary.data.estimatedTotalKg === null
                                ? '—'
                                : formatWeight(summary.data.estimatedTotalKg, units)
                        }
                        accent
                    />
                </div>
            ) : null}

            {stats.isLoading ? (
                <Skeleton className="h-48 rounded-2xl" />
            ) : rows.length === 0 ? (
                <p className="text-sm text-text-faint">{t('noStats')}</p>
            ) : (
                <div className="overflow-x-auto rounded-2xl bg-bg/40 ring-1 ring-hairline">
                    <table className="w-full min-w-[36rem] text-sm">
                        <thead>
                            <tr className="border-b border-hairline text-left font-mono text-[10px] uppercase tracking-widest text-text-faint">
                                <th className="px-5 py-3 font-normal">{ts('colExercise')}</th>
                                <th className="px-5 py-3 text-right font-normal">{ts('colVolume')}</th>
                                <th className="px-5 py-3 text-right font-normal">{ts('colSets')}</th>
                                <th className="px-5 py-3 text-right font-normal">{ts('colBestE1rm')}</th>
                                <th className="px-5 py-3 text-right font-normal">{ts('colHeaviest')}</th>
                            </tr>
                        </thead>
                        <tbody className="tabular-nums">
                            {rows.map((row) => (
                                <tr key={row.exerciseId} className="border-b border-hairline/60 last:border-0">
                                    <td className="px-5 py-3 text-text">{row.name}</td>
                                    <td className="px-5 py-3 text-right text-text">
                                        {formatWeight(row.totalVolumeKg, units)}
                                    </td>
                                    <td className="px-5 py-3 text-right text-text-dim">{row.totalSets}</td>
                                    <td className="px-5 py-3 text-right text-text-dim">
                                        {formatWeight(row.bestE1rmKg, units)}
                                    </td>
                                    <td className="px-5 py-3 text-right text-text-dim">
                                        {formatWeight(row.heaviestWeightKg, units)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
