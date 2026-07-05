'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'

import { cn } from '@/lib/cn'
import { TrackedButton } from './tracked'

export interface SlidingTabsItem {
    value: string
    label: string
}

/**
 * Segmented control with a pill that slides between options (transitions.dev
 * `16-tabs-sliding`). JS writes the active tab's offsetLeft/offsetWidth onto the
 * pill; CSS tweens it. First paint and resize snap without animation.
 */
export function SlidingTabs({
    items,
    value,
    onChange,
    className,
    analyticsId,
}: {
    items: SlidingTabsItem[]
    value: string
    onChange: (value: string) => void
    className?: string
    /** Stable id prefix; each tab emits `<id>-<value>` (values are code-defined
     *  literals, so the set stays bounded). */
    analyticsId: string
}) {
    const barRef = useRef<HTMLDivElement>(null)
    const pillRef = useRef<HTMLSpanElement>(null)
    const mounted = useRef(false)

    function movePill(animate: boolean) {
        const bar = barRef.current
        const pill = pillRef.current
        if (!bar || !pill) return

        const active = bar.querySelector<HTMLElement>('[aria-selected="true"]')
        if (!active) return

        if (animate) {
            pill.style.transform = `translateX(${active.offsetLeft}px)`
            pill.style.width = `${active.offsetWidth}px`
        } else {
            const previous = pill.style.transition
            pill.style.transition = 'none'
            pill.style.transform = `translateX(${active.offsetLeft}px)`
            pill.style.width = `${active.offsetWidth}px`
            void pill.offsetWidth // reflow before restoring the transition
            pill.style.transition = previous
        }
    }

    useLayoutEffect(() => {
        movePill(mounted.current) // first run snaps; later changes animate
        mounted.current = true
    }, [value, items])

    useEffect(() => {
        const onResize = () => movePill(false)
        window.addEventListener('resize', onResize)
        return () => window.removeEventListener('resize', onResize)
    }, [])

    return (
        <div ref={barRef} role="tablist" className={cn('t-tabs', className)}>
            <span ref={pillRef} className="t-tabs-pill" aria-hidden="true" />
            {items.map((item) => (
                <TrackedButton
                    // Values may be paths ('/admin/users') — squash to kebab-case.
                    analyticsId={`${analyticsId}-${item.value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '')}`}
                    key={item.value}
                    type="button"
                    role="tab"
                    aria-selected={item.value === value}
                    onClick={() => onChange(item.value)}
                    className="t-tab text-sm"
                >
                    {item.label}
                </TrackedButton>
            ))}
        </div>
    )
}
