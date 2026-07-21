import { useTranslations } from 'next-intl'

import { formatWeight, type Units } from '@/lib/units'
import type { AthleteExecution, AthleteSummary } from '@/lib/graphql/hooks/use-athlete'

import { TrendChip } from '@/components/stats/trend-chip'

function Stat({ label, value, note }: { label: string; value: string; note?: React.ReactNode }) {
    return (
        <div>
            <p className="font-mono text-lg tabular-nums text-text">{value}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-text-faint">{label}</p>
            {note ? <p className="mt-1">{note}</p> : null}
        </div>
    )
}

/**
 * How much work happened. Reference data, not a verdict — hence one flat strip
 * in the dashboard's `WeekStat` treatment rather than four cards competing with
 * the panels above. Zeros here are facts and render as zeros; only quantities
 * that can't be computed get a dash.
 */
export function WorkloadStrip({
    summary,
    execution,
    units,
}: {
    summary: AthleteSummary | undefined
    execution: AthleteExecution | undefined
    units: Units
}) {
    const t = useTranslations('coaching.athleteStats')

    return (
        <div className="rounded-2xl bg-bg/40 p-5 ring-1 ring-hairline md:p-6">
            <p className="font-mono text-eyebrow uppercase text-text-faint">{t('workloadTitle')}</p>

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
                <Stat
                    label={t('sessions')}
                    value={String(summary?.sessions ?? 0)}
                    note={
                        <span className="flex flex-wrap items-center gap-x-2 font-mono text-xs tabular-nums text-text-faint">
                            {execution?.sessionsPerWeek == null
                                ? null
                                : t('perWeek', { value: execution.sessionsPerWeek })}
                            <TrendChip change={execution?.sessionsChange} />
                        </span>
                    }
                />
                <Stat label={t('sets')} value={String(summary?.totalSets ?? 0)} />
                <Stat
                    label={t('volume')}
                    value={formatWeight(summary?.totalVolumeKg ?? 0, units)}
                    note={<TrendChip change={execution?.volumeChange} />}
                />
                <Stat
                    label={t('estTotal')}
                    value={summary?.estimatedTotalKg == null ? '—' : formatWeight(summary.estimatedTotalKg, units)}
                />
            </div>
        </div>
    )
}
