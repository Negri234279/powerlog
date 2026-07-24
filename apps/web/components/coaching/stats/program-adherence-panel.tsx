import { useTranslations } from 'next-intl'

import { TrackedLink } from '@/components/ui/tracked'

import { RateValue } from '@/components/stats/rate-value'
import { SegmentedBar } from '@/components/stats/segmented-bar'
import { StatsPanel } from './stats-panel'
import type { ExecutionView } from '@/components/stats/use-execution-view'

function LegendDot({ tone, children }: { tone: string; children: React.ReactNode }) {
    return (
        <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span className={`size-2 shrink-0 rounded-full ${tone}`} aria-hidden />
            {children}
        </span>
    )
}

/**
 * "Did they do what I programmed?" — and nothing else. The population is only
 * sessions **this coach** planned, which is why the panel is titled possessively
 * rather than carrying a "(planned by you)" caveat on every number: two words of
 * title do the disambiguation that a tooltip would otherwise have to.
 *
 * This is the one hero number on the tab. If it has no answer, nothing else gets
 * promoted to fill the gap — the panel says why instead.
 */
export function ProgramAdherencePanel({ view, athleteId }: { view: ExecutionView; athleteId: string }) {
    const t = useTranslations('coaching.athleteStats')
    const { adherence } = view

    return (
        <StatsPanel title={t('programTitle')} scope={t('programScope')}>
            {adherence.due === 0 && adherence.upcoming === 0 ? (
                // Nothing programmed at all: three dashes would say "we measured
                // and found zero". The truth is there is nothing to measure yet.
                <div className="flex flex-1 flex-col justify-center gap-3">
                    <p className="text-sm text-text-dim">{t('nothingProgrammed')}</p>
                    <TrackedLink
                        analyticsId="athlete-stats-plan-session"
                        href={`/coaching/athletes/${athleteId}/plan`}
                        className="self-start rounded-full bg-white/[0.06] px-4 py-2 text-sm text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1]"
                    >
                        {t('goToPlan')}
                    </TrackedLink>
                </div>
            ) : (
                <div className="flex flex-1 flex-col justify-between gap-6">
                    <RateValue
                        hero
                        rate={adherence.rate}
                        confident={adherence.confident}
                        detail={t('adherenceDetail', { done: adherence.done, due: adherence.due })}
                        reason={t('nothingDueYet', { upcoming: adherence.upcoming })}
                    />

                    <div>
                        <SegmentedBar
                            done={adherence.done}
                            missed={adherence.missed}
                            upcoming={adherence.upcoming}
                            label={t('adherenceAria', {
                                done: adherence.done,
                                missed: adherence.missed,
                                upcoming: adherence.upcoming,
                            })}
                        />
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-text-dim">
                            <LegendDot tone="bg-pr">{t('legendDone', { count: adherence.done })}</LegendDot>
                            <LegendDot tone="bg-ember">{t('legendMissed', { count: adherence.missed })}</LegendDot>
                            {adherence.upcoming > 0 ? (
                                <LegendDot tone="bg-white/20">
                                    {t('legendUpcoming', { count: adherence.upcoming })}
                                </LegendDot>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </StatsPanel>
    )
}
