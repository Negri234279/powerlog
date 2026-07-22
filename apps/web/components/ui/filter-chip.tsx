'use client'

import { cn } from '@/lib/cn'
import { ChevronDown } from './icons'
import { TrackedButton } from './tracked'

/**
 * A filter control shaped like a pill, with an optional count.
 *
 * Extracted from `MultiSelect`'s trigger so that every filter on a screen looks
 * like the same class of thing whether it opens a popover or just toggles —
 * while controls that are *not* filters (a measurement window, a sort) keep a
 * different shape on purpose.
 *
 * `count` is a string, not a number: callers need to render `—` when the data
 * behind the count hasn't arrived, and `0` would be a claim they can't make yet.
 */
export function FilterChip({
    label,
    count,
    active,
    disabled = false,
    expandable = false,
    expanded,
    onClick,
    analyticsId,
    ...aria
}: {
    label: string
    count?: string | null
    active: boolean
    disabled?: boolean
    /** Renders the chevron and wires `aria-haspopup` — for popover triggers. */
    expandable?: boolean
    expanded?: boolean
    onClick: () => void
    analyticsId: string
    'aria-label'?: string
    'aria-pressed'?: boolean
    'aria-describedby'?: string
}) {
    return (
        <TrackedButton
            analyticsId={analyticsId}
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-expanded={expandable ? expanded : undefined}
            aria-haspopup={expandable ? 'listbox' : undefined}
            {...aria}
            className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm ring-1 transition-colors duration-300',
                'disabled:cursor-default disabled:opacity-50',
                active
                    ? 'bg-ember/10 text-ember ring-ember/30'
                    : 'text-text-dim ring-hairline hover:bg-white/[0.04] hover:text-text',
            )}
        >
            {label}
            {count !== undefined && count !== null ? (
                <span className="font-mono text-xs tabular-nums">{count}</span>
            ) : null}
            {expandable ? (
                <ChevronDown className={cn('size-3.5 transition-transform duration-300', expanded && 'rotate-180')} />
            ) : null}
        </TrackedButton>
    )
}
