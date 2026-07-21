import { cn } from '@/lib/cn'

/** `0.94` → `94%`; nulls stay null so the caller can render its own reason. */
export function asPercent(rate: number | null | undefined): string | null {
    return rate === null || rate === undefined ? null : `${Math.round(rate * 100)}%`
}

/**
 * A rate and the count it was computed from, never one without the other — "80%"
 * over 15 sessions and over 2 sessions are not the same claim, and only the
 * denominator tells them apart.
 *
 * When the sample is too small to trust, the number loses its emphasis and the
 * count gains it: the honest figure becomes the loud one. When there's no rate
 * at all, `reason` says why in a few words rather than leaving a bare dash.
 */
export function RateValue({
    rate,
    detail,
    reason,
    confident,
    hero = false,
}: {
    rate: number | null | undefined
    /** The denominator, already translated — e.g. "14/16 sessions". */
    detail: string
    /** Shown instead of `detail` when there is no rate. */
    reason: string
    confident: boolean
    /** The one number that answers the panel's question. At most one per panel. */
    hero?: boolean
}) {
    const percent = asPercent(rate)

    return (
        <div>
            <p
                className={cn(
                    'font-display tabular-nums',
                    hero ? 'text-h2' : 'text-h3',
                    percent === null
                        ? 'text-text-faint'
                        : !confident
                          ? 'text-text-dim'
                          : hero
                            ? 'text-gradient-ember'
                            : 'text-text',
                )}
            >
                {percent ?? '—'}
            </p>
            <p
                className={cn(
                    'mt-1 font-mono text-sm tabular-nums',
                    percent === null ? 'text-text-faint' : confident ? 'text-text-dim' : 'text-text',
                )}
            >
                {percent === null ? reason : detail}
            </p>
        </div>
    )
}
