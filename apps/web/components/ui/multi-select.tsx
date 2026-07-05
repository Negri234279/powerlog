'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { useEnterExit } from '@/lib/hooks/use-enter-exit'
import { Check, ChevronDown } from './icons'
import { TrackedButton } from './tracked'

export interface MultiSelectOption {
    value: string
    label: string
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
}: {
    label: string
    options: MultiSelectOption[]
    selected: string[]
    onChange: (next: string[]) => void
    /** Stable id for the trigger's `ui_click`; option toggles share
     *  `<id>-option` (option values are dynamic — never put them in the id). */
    analyticsId: string
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
            <TrackedButton
                analyticsId={analyticsId}
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm ring-1 transition-colors duration-300',
                    count > 0
                        ? 'bg-ember/10 text-ember ring-ember/30'
                        : 'text-text-dim ring-hairline hover:bg-white/[0.04] hover:text-text',
                )}
            >
                {label}
                {count > 0 ? <span className="font-mono text-xs tabular-nums">{count}</span> : null}
                <ChevronDown className={cn('size-3.5 transition-transform duration-300', open && 'rotate-180')} />
            </TrackedButton>

            {mounted ? (
                <div
                    role="listbox"
                    aria-multiselectable
                    data-origin="top-left"
                    className={cn(
                        't-dropdown absolute left-0 top-full z-30 mt-1 max-h-64 min-w-44 overflow-y-auto rounded-2xl bg-shell p-1 shadow-xl ring-1 ring-hairline',
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
                            </TrackedButton>
                        )
                    })}
                </div>
            ) : null}
        </div>
    )
}
