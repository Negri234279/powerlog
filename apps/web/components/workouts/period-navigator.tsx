'use client'

import { useTranslations } from 'next-intl'

import { cn } from '@/lib/cn'
import { type PeriodMode, PERIOD_MODES } from '@/lib/workouts/period'
import { Input } from '@/components/ui/field'
import { ChevronLeft, ChevronRight } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'

/**
 * Time-window control for the workouts history — the single source of truth for
 * the date range. A segmented "mini grid" of period sizes (week · month · 3m ·
 * 6m · all) plus a `custom` escape hatch that reveals an inline date-range row.
 * ‹ › page through preset periods; "Actual" jumps back to the current one. In
 * `custom` and `all` there is nothing to step through, so the arrows hide.
 */
export function PeriodNavigator({
    mode,
    onMode,
    onPrev,
    onNext,
    onCurrent,
    label,
    isCurrent,
    from,
    to,
    onFrom,
    onTo,
}: {
    mode: PeriodMode
    onMode: (mode: PeriodMode) => void
    onPrev: () => void
    onNext: () => void
    onCurrent: () => void
    /** Formatted label for the current window (range, "All history", or custom span). */
    label: string
    isCurrent: boolean
    from: string
    to: string
    onFrom: (value: string) => void
    onTo: (value: string) => void
}) {
    const t = useTranslations('workouts')
    const canNavigate = mode !== 'all' && mode !== 'custom'
    const isCustom = mode === 'custom'

    return (
        <div className="mt-6 rounded-2xl bg-shell p-1.5 ring-1 ring-hairline">
            <div className="t-acc inset-hi rounded-[calc(1rem-0.25rem)] bg-surface" data-open={isCustom}>
                <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-1">
                        {canNavigate ? (
                            <TrackedButton
                                analyticsId="workouts-period-prev"
                                type="button"
                                onClick={onPrev}
                                aria-label={t('period.prev')}
                                className="flex size-8 items-center justify-center rounded-full text-text-dim transition-colors duration-300 hover:bg-white/[0.06] hover:text-text"
                            >
                                <ChevronLeft className="size-4" />
                            </TrackedButton>
                        ) : null}

                        <span
                            className={cn(
                                'text-center font-display text-base tracking-tight sm:text-left',
                                canNavigate && 'min-w-[10rem]',
                            )}
                        >
                            {label}
                        </span>

                        {canNavigate ? (
                            <TrackedButton
                                analyticsId="workouts-period-next"
                                type="button"
                                onClick={onNext}
                                aria-label={t('period.next')}
                                className="flex size-8 items-center justify-center rounded-full text-text-dim transition-colors duration-300 hover:bg-white/[0.06] hover:text-text"
                            >
                                <ChevronRight className="size-4" />
                            </TrackedButton>
                        ) : null}

                        {canNavigate && !isCurrent ? (
                            <TrackedButton
                                analyticsId="workouts-period-current"
                                type="button"
                                onClick={onCurrent}
                                className="ml-1 rounded-full px-3 py-1 text-xs text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                            >
                                {t('period.current')}
                            </TrackedButton>
                        ) : null}
                    </div>

                    <div className="flex w-full flex-wrap justify-center gap-1 rounded-2xl bg-bg/60 p-1 ring-1 ring-hairline sm:inline-flex sm:w-auto sm:flex-nowrap sm:justify-start sm:gap-0 sm:rounded-full sm:self-auto">
                        {PERIOD_MODES.map((key) =>
                            // A hairline before `custom` marks it as the manual escape hatch.
                            key === 'custom' ? (
                                <div key={key} className="flex items-center">
                                    <span className="mx-1 h-4 w-px bg-hairline" aria-hidden />
                                    <TrackedButton
                                        analyticsId="workouts-period-custom"
                                        type="button"
                                        onClick={() => onMode(key)}
                                        aria-pressed={mode === key}
                                        className={cn(
                                            'rounded-full px-3 py-1.5 text-sm transition-colors duration-300',
                                            mode === key
                                                ? 'bg-white/[0.08] text-text'
                                                : 'text-text-dim hover:text-text',
                                        )}
                                    >
                                        {t('period.custom')}
                                    </TrackedButton>
                                </div>
                            ) : (
                                <TrackedButton
                                    analyticsId={`workouts-period-${key}`}
                                    key={key}
                                    type="button"
                                    onClick={() => onMode(key)}
                                    aria-pressed={mode === key}
                                    className={cn(
                                        'rounded-full px-3 py-1.5 text-sm transition-colors duration-300',
                                        mode === key ? 'bg-white/[0.08] text-text' : 'text-text-dim hover:text-text',
                                    )}
                                >
                                    {t(`period.${key}`)}
                                </TrackedButton>
                            ),
                        )}
                    </div>
                </div>

                {/* Inline custom date-range row — accordion-revealed while `custom` is active. */}
                <div className="t-acc-panel">
                    <div className="t-acc-panel-inner">
                        <div className="flex flex-col gap-2 border-t border-hairline px-3 py-3 sm:flex-row sm:items-center">
                            <span className="text-xs uppercase tracking-widest text-text-faint">
                                {t('period.custom')}
                            </span>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Input
                                    type="date"
                                    value={from}
                                    max={to || undefined}
                                    onChange={(e) => onFrom(e.target.value)}
                                    aria-label={t('fromDate')}
                                    className="w-40"
                                />
                                <span className="hidden text-text-faint sm:inline">–</span>
                                <Input
                                    type="date"
                                    value={to}
                                    min={from || undefined}
                                    onChange={(e) => onTo(e.target.value)}
                                    aria-label={t('toDate')}
                                    className="w-40"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
