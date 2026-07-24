'use client'

import { useLocale, useTranslations } from 'next-intl'

import { cn } from '@/lib/cn'
import { formatSessionDate } from '@/lib/format-date'
import { useTrainingExecution } from '@/lib/graphql/hooks/use-workouts'
import { CenteredMeter } from '@/components/stats/centered-meter'
import { RateValue, asPercent } from '@/components/stats/rate-value'
import { TrendChip } from '@/components/stats/trend-chip'
import { type Staleness, useExecutionView } from '@/components/stats/use-execution-view'
import { Skeleton } from '@/components/ui/skeleton'

const DOT: Record<Staleness, string> = {
    fresh: 'bg-pr',
    slipping: 'bg-text-dim',
    stale: 'bg-ember',
    never: 'bg-text-faint',
}

function LastSession({
    iso,
    days,
    staleness,
}: {
    iso: string | null | undefined
    days: number | null | undefined
    staleness: Staleness
}) {
    const t = useTranslations('stats.execution')
    const locale = useLocale()

    return (
        <span className="flex items-center gap-2 text-sm">
            <span className={cn('size-2 shrink-0 rounded-full', DOT[staleness])} aria-hidden />
            {iso === null || iso === undefined || days === null || days === undefined ? (
                <span className="text-text-faint">{t('neverTrained')}</span>
            ) : (
                <>
                    <span className={staleness === 'stale' ? 'text-ember' : 'text-text'}>
                        {days === 0 ? t('today') : t('daysAgo', { days })}
                    </span>
                    <span className="text-text-faint">· {formatSessionDate(iso, locale)}</span>
                </>
            )}
        </span>
    )
}

/**
 * The lifter's own execution: adherence, set outcomes, load compliance and
 * frequency. Unlike the coach's view there is no possessive split — for your own
 * numbers every population is the same "you", so one panel says it all. The rate
 * primitives are shared with the coach's tab (`components/stats`), so a rate here
 * carries its denominator and dims below a trustworthy sample exactly as it does
 * there.
 */
export function ExecutionSection({ from }: { from?: string }) {
    const t = useTranslations('stats.execution')
    const ts = useTranslations('stats')

    const execution = useTrainingExecution(from)
    const view = useExecutionView(execution.data ?? undefined)
    const data = execution.data

    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="font-display text-h3">{t('title')}</h2>
                        <p className="mt-1 text-sm text-text-dim">{t('subtitle')}</p>
                    </div>
                    {view ? (
                        <LastSession
                            iso={data?.lastSessionAt}
                            days={data?.daysSinceLastSession}
                            staleness={view.staleness}
                        />
                    ) : null}
                </div>

                {execution.isLoading || !view ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i}>
                                <Skeleton className="h-4 w-28 rounded" />
                                <Skeleton className="mt-2 h-8 w-20 rounded-lg" />
                                <Skeleton className="mt-2 h-4 w-24 rounded" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <p className="min-h-[2.5rem] text-sm text-text-dim">{t('adherenceLabel')}</p>
                            <RateValue
                                rate={view.adherence.rate}
                                confident={view.adherence.confident}
                                detail={t('adherenceDetail', { done: view.adherence.done, due: view.adherence.due })}
                                reason={view.adherence.upcoming > 0 ? t('nothingDue') : t('noPlanned')}
                            />
                        </div>

                        <div>
                            <p className="min-h-[2.5rem] text-sm text-text-dim">{t('successLabel')}</p>
                            <RateValue
                                rate={view.success.rate}
                                confident={view.success.confident}
                                detail={t('successDetail', { ok: view.success.ok, marked: view.success.marked })}
                                reason={t('noMarkedSets')}
                            />
                        </div>

                        <div>
                            <p className="min-h-[2.5rem] text-sm text-text-dim">{t('complianceLabel')}</p>
                            <RateValue
                                rate={view.compliance.rate}
                                confident={view.compliance.confident}
                                detail={t('complianceDetail', { sets: view.compliance.sets })}
                                reason={t('noProgrammedSets')}
                            />
                            {view.compliance.rate !== null && view.compliance.band !== null ? (
                                <div className="mt-3">
                                    <CenteredMeter
                                        rate={view.compliance.rate}
                                        band={view.compliance.band}
                                        label={t(`complianceAria.${view.compliance.band}`, {
                                            percent: asPercent(view.compliance.rate) ?? '',
                                        })}
                                    />
                                </div>
                            ) : null}
                        </div>

                        <div>
                            <p className="min-h-[2.5rem] text-sm text-text-dim">{t('frequencyLabel')}</p>
                            <p className="font-display text-h3 tabular-nums text-text">
                                {data?.sessionsPerWeek == null ? (
                                    <span className="text-text-faint">—</span>
                                ) : (
                                    data.sessionsPerWeek
                                )}
                            </p>
                            <p className="mt-1 flex items-center gap-2 font-mono text-sm tabular-nums text-text-faint">
                                {ts('perWeek', { value: data?.sessionsPerWeek ?? 0 })}
                                <TrendChip change={data?.sessionsChange} />
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
