import { useTranslations } from 'next-intl'

import { CenteredMeter } from './centered-meter'
import { MetricRow } from './metric-row'
import { RateValue, asPercent } from './rate-value'
import { StatsPanel } from './stats-panel'
import type { AthleteStatsView } from './use-athlete-stats-view'

/**
 * "How do they execute?" — over **all** their training, not just what this coach
 * wrote. Scoping it to coach-planned work would leave the number empty for most
 * athletes, and execution quality isn't a question about obedience anyway.
 *
 * Rows rather than a hero number, and meters rather than a segmented bar: these
 * are independent measures, and they must not visually rhyme with the adherence
 * panel beside them.
 */
export function ExecutionPanel({ view, avgRpe }: { view: AthleteStatsView; avgRpe: number | null | undefined }) {
    const t = useTranslations('coaching.athleteStats')
    const { success, compliance } = view

    return (
        <StatsPanel title={t('executionTitle')} scope={t('executionScope')}>
            <div className="flex flex-1 flex-col gap-4">
                <MetricRow label={t('successLabel')}>
                    <RateValue
                        rate={success.rate}
                        confident={success.confident}
                        detail={t('successDetail', { ok: success.ok, marked: success.marked })}
                        reason={t('noMarkedSets')}
                    />
                </MetricRow>

                <MetricRow
                    label={t('complianceLabel')}
                    meter={
                        compliance.rate !== null && compliance.band !== null ? (
                            <CenteredMeter
                                rate={compliance.rate}
                                band={compliance.band}
                                label={t(`complianceAria.${compliance.band}`, {
                                    percent: asPercent(compliance.rate) ?? '',
                                })}
                            />
                        ) : undefined
                    }
                >
                    <RateValue
                        rate={compliance.rate}
                        confident={compliance.confident}
                        detail={t('complianceDetail', { sets: compliance.sets })}
                        reason={t('noProgrammedSets')}
                    />
                </MetricRow>

                <MetricRow label={t('avgRpeLabel')}>
                    <p className="font-display text-h3 tabular-nums text-text">
                        {avgRpe === null || avgRpe === undefined ? (
                            <span className="text-text-faint">—</span>
                        ) : (
                            <>
                                {avgRpe}
                                <span className="font-mono text-sm text-text-faint"> /10</span>
                            </>
                        )}
                    </p>
                    <p className="mt-1 font-mono text-sm text-text-faint">
                        {avgRpe === null || avgRpe === undefined ? t('noRpe') : t('avgRpeDetail')}
                    </p>
                </MetricRow>
            </div>
        </StatsPanel>
    )
}
