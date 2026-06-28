'use client'

import { useEffect, useRef } from 'react'

import { cn } from '@/lib/cn'

const SWAP_DUR = 150 // matches --text-swap-dur

/**
 * Swaps its text in place when `text` changes (transitions.dev `04-text-states-swap`
 * — old text exits up with blur, new text enters from below). The initial text is
 * rendered as children (SSR-safe); every change is driven imperatively so React
 * never overwrites the textContent mid-transition.
 */
export function TextSwap({ text, className }: { text: string; className?: string }) {
    const ref = useRef<HTMLSpanElement>(null)
    const initial = useRef(text)
    const prev = useRef(text)

    useEffect(() => {
        const el = ref.current
        if (!el || prev.current === text) return

        const next = text
        prev.current = next
        el.classList.add('is-exit')
        const timer = setTimeout(() => {
            el.textContent = next
            el.classList.remove('is-exit')
            el.classList.add('is-enter-start')
            void el.offsetHeight // reflow so the enter animates
            el.classList.remove('is-enter-start')
        }, SWAP_DUR)

        return () => clearTimeout(timer)
    }, [text])

    return (
        <span ref={ref} className={cn('t-text-swap', className)}>
            {initial.current}
        </span>
    )
}
