'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'

interface RevealProps {
    children: React.ReactNode
    /** Stagger in ms before this element resolves. */
    delay?: number
    className?: string
}

/**
 * Reveals its children with a heavy blur-lift as they enter the viewport
 * (one-shot). The actual motion lives in `[data-reveal]` CSS so it degrades to
 * an instant show under `prefers-reduced-motion`.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
    const ref = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry?.isIntersecting) {
                    setVisible(true)
                    io.disconnect()
                }
            },
            { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
        )
        io.observe(el)
        return () => io.disconnect()
    }, [])

    return (
        <div
            ref={ref}
            data-reveal
            data-visible={visible}
            style={{ transitionDelay: `${delay}ms` }}
            className={cn(className)}
        >
            {children}
        </div>
    )
}
