'use client'

import { useEffect, useRef } from 'react'

import { cn } from '@/lib/cn'

/**
 * Re-enters each character with a blurred slide when the value changes
 * (transitions.dev `02-number-pop-in`). The last two characters stagger so
 * decimals feel alive. Initial value is rendered as children (SSR/no-JS safe);
 * updates rebuild the digit spans imperatively and replay.
 */
export function PopNumber({ value, className }: { value: number | string; className?: string }) {
    const ref = useRef<HTMLSpanElement>(null)
    const initial = useRef(String(value))
    const prev = useRef<string | null>(null)
    const str = String(value)

    useEffect(() => {
        const group = ref.current
        if (!group || prev.current === str) return
        prev.current = str

        group.classList.remove('is-animating')
        group.replaceChildren()
        const chars = [...str]
        chars.forEach((char, i) => {
            const span = document.createElement('span')
            span.className = 't-digit'
            span.textContent = char
            if (i === chars.length - 2) span.dataset['stagger'] = '1'
            else if (i === chars.length - 1) span.dataset['stagger'] = '2'
            group.appendChild(span)
        })
        void group.offsetHeight // reflow so the animation replays
        group.classList.add('is-animating')
    }, [str])

    return (
        <span ref={ref} className={cn('t-digit-group', className)} aria-label={str}>
            {initial.current}
        </span>
    )
}
