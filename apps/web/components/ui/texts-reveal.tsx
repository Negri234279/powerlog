'use client'

import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode, useEffect, useRef } from 'react'

import { cn } from '@/lib/cn'

/**
 * Staggered blurred rise for a small stack of text lines (transitions.dev
 * `18-texts-reveal`) — eyebrow + heading (+ subtitle). Each direct child element
 * is tagged as a stagger line (no extra wrappers, so margins are preserved) and
 * the entrance plays on mount. Honours `prefers-reduced-motion`.
 */
export function TextsReveal({ children, className }: { children: ReactNode; className?: string }) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return

        // Reveal on the next frame so the hidden initial state paints first.
        const raf = requestAnimationFrame(() => el.classList.add('is-shown'))

        return () => cancelAnimationFrame(raf)
    }, [])

    let line = 0
    const lines = Children.map(children, (child) => {
        if (!isValidElement(child)) return child

        line += 1
        const element = child as ReactElement<{ className?: string }>
        return cloneElement(element, {
            className: cn('t-stagger-line', `t-stagger-line--${line}`, element.props.className),
        })
    })

    return (
        <div ref={ref} className={cn('t-stagger', className)}>
            {lines}
        </div>
    )
}
