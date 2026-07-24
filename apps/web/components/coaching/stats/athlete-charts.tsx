'use client'

import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { cn } from '@/lib/cn'
import type { AthleteStatsRow } from '@/lib/graphql/hooks/use-athlete'
import {
    useAthleteDistribution,
    useAthleteExecutionSeries,
    useAthleteVolumeSeries,
} from '@/lib/graphql/hooks/use-athlete'
import { formatWeight, type Units } from '@/lib/units'
import {
    AdherenceChart,
    DistributionChart,
    IntensityChart,
    PlannedVsActualChart,
    WeeklyVolumeChart,
} from '@/components/charts'
import { TrackedButton } from '@/components/ui/tracked'

import { ChartSection } from '@/components/stats/chart-section'
import { StrengthSection } from './strength-section'

/**
 * Everything that's a chart, in the order a coach reads them: what they were
 * asked to do (adherence, load) before what they did (strength, volume, balance).
 * The first two exist only here — the athlete's own analytics has no notion of
 * "what my coach programmed", and no reason to.
 */
export function AthleteCharts({
    athleteId,
    rows,
    from,
    units,
}: {
    athleteId: string
    rows: readonly AthleteStatsRow[]
    from?: string
    units: Units
}) {
    const t = useTranslations('coaching.athleteStats')
    const ts = useTranslations('stats')
    const tt = useTranslations('taxonomy')
    const [intensity, setIntensity] = useState<'rpe' | 'rir'>('rpe')

    const series = useAthleteExecutionSeries(athleteId, from)
    const volume = useAthleteVolumeSeries(athleteId, from)
    const distribution = useAthleteDistribution(athleteId, from)

    const formatValue = useMemo(() => (value: number) => formatWeight(value, units), [units])
    const weekOf = (date: string) => ts('weekOf', { date })

    const weeks = series.data ?? []
    // A week the coach programmed nothing in is not a gap in adherence — it just
    // isn't part of this chart's population.
    const programmedWeeks = weeks.filter((week) => week.plannedCompleted + week.plannedMissed > 0)
    const loadWeeks = weeks.filter((week) => week.plannedLoadKg > 0)

    return (
        <>
            <ChartSection
                title={t('adherenceChartTitle')}
                scope={t('adherenceChartScope')}
                loading={series.isLoading}
                empty={programmedWeeks.length === 0 ? t('noProgrammedWeeks') : null}
            >
                <AdherenceChart
                    data={programmedWeeks}
                    doneName={t('chartDone')}
                    missedName={t('chartMissed')}
                    weekOfLabel={weekOf}
                />
            </ChartSection>

            <ChartSection
                title={t('loadChartTitle')}
                scope={t('loadChartScope')}
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
            </ChartSection>

            <StrengthSection athleteId={athleteId} rows={rows} from={from} units={units} />

            <ChartSection
                title={ts('weeklyVolumeTitle')}
                scope={t('volumeScope')}
                loading={volume.isLoading}
                empty={(volume.data ?? []).length === 0 ? ts('noVolume') : null}
            >
                <WeeklyVolumeChart
                    data={volume.data ?? []}
                    formatValue={formatValue}
                    seriesName={ts('seriesVolume')}
                    weekOfLabel={weekOf}
                />
            </ChartSection>

            <div className="grid gap-4 lg:grid-cols-2">
                <ChartSection
                    title={ts('byMuscleTitle')}
                    scope={t('distributionScope')}
                    loading={distribution.isLoading}
                    empty={(distribution.data?.byMuscle ?? []).length === 0 ? ts('noData') : null}
                >
                    <DistributionChart
                        data={distribution.data?.byMuscle ?? []}
                        formatValue={formatValue}
                        seriesName={ts('seriesVolume')}
                        labelFor={(key) => tt(`muscle.${key}`)}
                    />
                </ChartSection>

                <ChartSection
                    title={ts('byMovementTitle')}
                    scope={t('distributionScope')}
                    loading={distribution.isLoading}
                    empty={(distribution.data?.byCategory ?? []).length === 0 ? ts('noData') : null}
                >
                    <DistributionChart
                        data={distribution.data?.byCategory ?? []}
                        formatValue={formatValue}
                        seriesName={ts('seriesVolume')}
                        labelFor={(key) => tt(`category.${key}`)}
                    />
                </ChartSection>
            </div>

            <ChartSection
                title={ts('intensityTitle')}
                scope={t('intensityScope')}
                loading={distribution.isLoading}
                empty={
                    (distribution.data?.[intensity] ?? []).length === 0
                        ? ts('noIntensity', { metric: intensity.toUpperCase() })
                        : null
                }
                action={
                    <div className="inline-flex rounded-full bg-bg/60 p-1 ring-1 ring-hairline">
                        {(['rpe', 'rir'] as const).map((metric) => (
                            <TrackedButton
                                analyticsId={`athlete-stats-intensity-${metric}`}
                                key={metric}
                                type="button"
                                onClick={() => setIntensity(metric)}
                                className={cn(
                                    'rounded-full px-4 py-1.5 text-sm uppercase transition-colors duration-300',
                                    intensity === metric
                                        ? 'bg-white/[0.08] text-text'
                                        : 'text-text-dim hover:text-text',
                                )}
                            >
                                {metric}
                            </TrackedButton>
                        ))}
                    </div>
                }
            >
                <IntensityChart
                    data={distribution.data?.[intensity] ?? []}
                    label={intensity.toUpperCase()}
                    seriesName={ts('seriesSets')}
                    intense={(value) => (intensity === 'rpe' ? value >= 8 : value <= 2)}
                />
            </ChartSection>
        </>
    )
}
