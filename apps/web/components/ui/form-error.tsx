'use client'

import { useEffect, useRef } from 'react'

import { cn } from '@/lib/cn'

const SHAKE_DUR = 280 // matches the t-input-shake keyframe total

/**
 * Inline form error that shakes when a new message appears (transitions.dev
 * `12-error-state-shake`). Drop-in replacement for `{error ? <p…>{error}</p> : null}`.
 */
export function FormError({ error, className }: { error?: string | null; className?: string }) {
    const ref = useRef<HTMLParagraphElement>(null)
    const prev = useRef<string | null>(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return

        if (error && error !== prev.current) {
            // Replay the shake from a clean baseline.
            el.classList.remove('is-shaking')
            void el.offsetWidth
            el.classList.add('is-shaking')
            const timer = setTimeout(() => el.classList.remove('is-shaking'), SHAKE_DUR + 20)
            prev.current = error

            return () => clearTimeout(timer)
        }

        prev.current = error ?? null
    }, [error])

    if (!error) return null

    return (
        <p ref={ref} role="alert" className={cn('t-input text-sm text-ember', className)}>
            {error}
        </p>
    )
}
