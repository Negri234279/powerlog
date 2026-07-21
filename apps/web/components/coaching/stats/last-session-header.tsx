import { useLocale, useTranslations } from 'next-intl'

import { cn } from '@/lib/cn'
import { formatSessionDate } from '@/lib/format-date'

import type { Staleness } from '@/components/stats/use-execution-view'

const DOT: Record<Staleness, string> = {
    fresh: 'bg-pr',
    slipping: 'bg-text-dim',
    stale: 'bg-ember',
    never: 'bg-text-faint',
}

/**
 * When the athlete last trained — deliberately **above** the range tabs, because
 * it is the one figure here that ignores them. "Last trained 40 days ago" is
 * exactly what a 30-day window cannot say, and it's the fact a coach most needs
 * to see. Putting it outside the filtered area makes that rule spatial, so no
 * card below needs an "(all-time)" caveat.
 */
export function LastSessionHeader({
    lastSessionAt,
    days,
    staleness,
}: {
    lastSessionAt: string | null | undefined
    days: number | null | undefined
    staleness: Staleness
}) {
    const t = useTranslations('coaching.athleteStats')
    const locale = useLocale()

    return (
        <div>
            <p className="font-mono text-eyebrow uppercase text-text-faint">{t('lastSession')}</p>
            <p className="mt-2 flex items-center gap-2.5 text-sm">
                <span className={cn('size-2 shrink-0 rounded-full', DOT[staleness])} aria-hidden />
                {lastSessionAt === null || lastSessionAt === undefined || days === null || days === undefined ? (
                    <span className="text-text-faint">{t('neverTrained')}</span>
                ) : (
                    <>
                        <span className={cn(staleness === 'stale' ? 'text-ember' : 'text-text')}>
                            {days === 0 ? t('today') : t('daysAgo', { days })}
                        </span>
                        <span className="text-text-faint">· {formatSessionDate(lastSessionAt, locale)}</span>
                    </>
                )}
            </p>
        </div>
    )
}
