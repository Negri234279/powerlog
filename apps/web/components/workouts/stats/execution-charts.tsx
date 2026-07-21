'use client'

import { useTranslations } from 'next-intl'
import { useMemo } from 'react'

import { useTrainingExecutionSeries } from '@/lib/graphql/hooks/use-workouts'
import { formatWeight, type Units } from '@/lib/units'
import { AdherenceChart, PlannedVsActualChart } from '@/components/charts'
import { Skeleton } from '@/components/ui/skeleton'

function ChartCard({
    title,
    subtitle,
    loading,
    empty,
    children,
}: {
    title: string
    subtitle: string
    loading: boolean
    empty: string | null
    children: React.ReactNode
}) {
    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-6">
                <h2 className="font-display text-h3">{title}</h2>
                <p className="mb-5 mt-1 text-sm text-text-dim">{subtitle}</p>
                {loading ? (
                    <Skeleton className="h-56 w-full rounded-2xl" />
                ) : empty ? (
                    <p className="text-sm text-text-faint">{empty}</p>
                ) : (
                    children
                )}
            </div>
        </div>
    )
}

/**
 * The lifter's own adherence and programmed-vs-executed load, week by week — the
 * two coach-facing charts turned inward. "When did I slip" and "am I quietly
 * undershooting the program" are worth just as much to the person training as to
 * whoever wrote it.
 */
export function ExecutionCharts({ from, units }: { from?: string; units: Units }) {
    const t = useTranslations('stats.execution')
    const ts = useTranslations('stats')

    const series = useTrainingExecutionSeries(from)
    const formatValue = useMemo(() => (value: number) => formatWeight(value, units), [units])
    const weekOf = (date: string) => ts('weekOf', { date })

    const weeks = series.data ?? []
    const programmedWeeks = weeks.filter((week) => week.plannedCompleted + week.plannedMissed > 0)
    const loadWeeks = weeks.filter((week) => week.plannedLoadKg > 0)

    return (
        <>
            <ChartCard
                title={t('adherenceChartTitle')}
                subtitle={t('adherenceChartSubtitle')}
                loading={series.isLoading}
                empty={programmedWeeks.length === 0 ? t('noProgrammedWeeks') : null}
            >
                <AdherenceChart
                    data={programmedWeeks}
                    doneName={t('chartDone')}
                    missedName={t('chartMissed')}
                    weekOfLabel={weekOf}
                />
            </ChartCard>

            <ChartCard
                title={t('loadChartTitle')}
                subtitle={t('loadChartSubtitle')}
                loading={series.isLoading}
                empty={loadWeeks.length === 0 ? t('noProgrammedLoad') : null}
            >
                <PlannedVsActualChart
                    data={loadWeeks}
                    formatValue={formatValue}
                    plannedName={t('chartPlanned')}
                    actualName={t('chartActual')}
                    weekOfLabel={weekOf}
                />
            </ChartCard>
        </>
    )
}
