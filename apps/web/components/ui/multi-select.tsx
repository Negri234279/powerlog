'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { useEnterExit } from '@/lib/hooks/use-enter-exit'
import { FilterChip } from './filter-chip'
import { Check } from './icons'
import { TrackedButton } from './tracked'

export interface MultiSelectOption {
    value: string
    label: string
    /** Shown right-aligned; a string so callers can render `—` before data lands. */
    count?: string | null
    /** The count with its unit, for screen readers ("4 athletes"). */
    countLabel?: string
}

/**
 * Compact multi-select dropdown: a pill that opens a checkbox list. Selecting an
 * option keeps the popover open (multi-pick); closes on Escape or outside click.
 */
export function MultiSelect({
    label,
    options,
    selected,
    onChange,
    analyticsId,
    badge,
    disabled = false,
    ariaLabel,
    describedBy,
}: {
    label: string
    options: MultiSelectOption[]
    selected: string[]
    onChange: (next: string[]) => void
    /** Stable id for the trigger's `ui_click`; option toggles share
     *  `<id>-option` (option values are dynamic — never put them in the id). */
    analyticsId: string
    /**
     * What the trigger's number shows. Defaults to how many options are ticked,
     * which is right for independent tags — but a facet over a partition wants to
     * report *matched items* instead, and only the caller can count those. The
     * active styling still follows the selection, not this.
     */
    badge?: string | null
    disabled?: boolean
    /** The visible label changes with the selection, so it can't be the name. */
    ariaLabel?: string
    describedBy?: string
}) {
    const [open, setOpen] = useState(false)
    const { mounted, className: stateClass } = useEnterExit(open)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return

        const onPointerDown = (e: PointerEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false)
        }

        document.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('keydown', onKey)

        return () => {
            document.removeEventListener('pointerdown', onPointerDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    function toggle(value: string) {
        onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
    }

    const count = selected.length

    return (
        <div ref={ref} className="relative">
            <FilterChip
                analyticsId={analyticsId}
                label={label}
                count={badge === undefined ? (count > 0 ? String(count) : undefined) : badge}
                active={count > 0}
                disabled={disabled}
                expandable
                expanded={open}
                onClick={() => setOpen((o) => !o)}
                aria-label={ariaLabel}
                aria-describedby={describedBy}
            />

            {mounted ? (
                <div
                    role="listbox"
                    aria-multiselectable
                    aria-label={ariaLabel}
                    data-origin="top-left"
                    className={cn(
                        't-dropdown absolute left-0 top-full z-30 mt-1 max-h-64 min-w-52 overflow-y-auto rounded-2xl bg-shell p-1 shadow-xl ring-1 ring-hairline',
                        stateClass,
                    )}
                >
                    {options.map((option) => {
                        const active = selected.includes(option.value)

                        return (
                            <TrackedButton
                                analyticsId={`${analyticsId}-option`}
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={active}
                                onClick={() => toggle(option.value)}
                                className={cn(
                                    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors duration-200',
                                    active ? 'text-text' : 'text-text-dim hover:bg-white/[0.05] hover:text-text',
                                )}
                            >
                                <span
                                    className={cn(
                                        'grid size-4 shrink-0 place-items-center rounded border transition-colors duration-200',
                                        active ? 'border-ember bg-ember/20 text-ember' : 'border-hairline',
                                    )}
                                >
                                    {active ? <Check className="size-3" /> : null}
                                </span>
                                {option.label}
                                {option.count !== undefined && option.count !== null ? (
                                    <span className="ml-auto font-mono text-xs tabular-nums text-text-faint">
                                        {/* The bare number would be read as part of
                                            the label ("Sin entrenar 4"); the unit
                                            only exists for screen readers. */}
                                        <span aria-hidden>{option.count}</span>
                                        <span className="sr-only">{option.countLabel ?? option.count}</span>
                                    </span>
                                ) : null}
                            </TrackedButton>
                        )
                    })}
                </div>
            ) : null}
        </div>
    )
}
