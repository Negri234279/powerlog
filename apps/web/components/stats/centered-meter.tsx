import { cn } from '@/lib/cn'

import type { ComplianceBand } from './use-athlete-stats-view'

/** How far either side of the target the meter can show before it flattens. */
const WINDOW = 0.3

const BAND_FILL: Record<ComplianceBand, string> = {
    under: 'bg-ember',
    onPlan: 'bg-pr',
    over: 'bg-amber',
}

/**
 * A meter anchored at the target rather than filled from the left, because the
 * target here is 100% and not a maximum: training 8% heavier than programmed is
 * a direction worth seeing, and a left-filled bar would either clip it or imply
 * the athlete had maxed something out.
 *
 * The fill grows from the centre tick — right when they went over, left when
 * they fell short — and stops growing past ±30%, where the exact size has
 * stopped mattering and only the direction still does.
 */
export function CenteredMeter({ rate, band, label }: { rate: number; band: ComplianceBand; label: string }) {
    const offset = Math.min(Math.abs(rate - 1), WINDOW) / WINDOW / 2
    const width = `${offset * 100}%`

    return (
        <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]" role="img" aria-label={label}>
            <span
                className={cn('absolute top-0 h-full', BAND_FILL[band])}
                style={rate >= 1 ? { left: '50%', width } : { right: '50%', width }}
                aria-hidden
            />
            <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/30" aria-hidden />
        </div>
    )
}
