import { useTranslations } from 'next-intl'

import { cn } from '@/lib/cn'

/**
 * Signed change against the preceding period. Renders nothing when there is no
 * previous period — in the "all time" range that absence is not missing data,
 * and a `—` there would read as a broken number.
 *
 * The arrow never carries the meaning alone: sign and figure are always present,
 * and the accessible label spells the comparison out.
 */
export function TrendChip({ change }: { change: number | null | undefined }) {
    const t = useTranslations('coaching.athleteStats')

    if (change === null || change === undefined) return null

    const percent = Math.round(change * 100)
    // Rounds to zero: a change too small to name is not worth a chip.
    if (percent === 0) return null

    const up = percent > 0
    const label = `${up ? '+' : '−'}${Math.abs(percent)}%`

    return (
        <span
            className={cn('font-mono text-xs tabular-nums', up ? 'text-pr' : 'text-ember')}
            aria-label={t('trendAria', { change: label })}
        >
            <span aria-hidden>{up ? '▲' : '▼'} </span>
            {label}
        </span>
    )
}
