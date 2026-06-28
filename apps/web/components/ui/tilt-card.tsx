'use client'

import { type PointerEvent as ReactPointerEvent, type ReactNode, useRef } from 'react'

import { cn } from '@/lib/cn'

const MAX = 12 // peak tilt in degrees at the card edges

/**
 * Card that tilts in 3D toward the pointer with a cursor-tracked glare
 * (transitions.dev `19-card-tilt`). The pointer is tracked on the flat outer
 * wrapper so the rotating card can't slip its edges out from under the cursor.
 * Pointer-only (mouse hover + touch tap-hold-drag); flattens under reduced motion.
 *
 * `cardClassName` styles the tilting surface (give it the rounded card classes);
 * the glare clips to those corners via the snippet's `overflow: hidden`.
 */
export function TiltCard({
    children,
    className,
    cardClassName,
}: {
    children: ReactNode
    className?: string
    cardClassName?: string
}) {
    const tiltRef = useRef<HTMLDivElement>(null)
    const cardRef = useRef<HTMLDivElement>(null)

    const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    function reset() {
        const tilt = tiltRef.current
        const card = cardRef.current
        if (!tilt || !card) return

        tilt.classList.remove('is-hover')
        card.classList.remove('is-tilting')
        card.style.setProperty('--tilt-rx', '0deg')
        card.style.setProperty('--tilt-ry', '0deg')
    }

    function track(e: ReactPointerEvent<HTMLDivElement>) {
        const tilt = tiltRef.current
        const card = cardRef.current
        if (!tilt || !card || reduced()) return

        const r = tilt.getBoundingClientRect()
        const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
        const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))

        tilt.classList.add('is-hover')
        card.classList.add('is-tilting')
        card.style.setProperty('--tilt-ry', `${((px - 0.5) * MAX).toFixed(2)}deg`)
        card.style.setProperty('--tilt-rx', `${((0.5 - py) * MAX).toFixed(2)}deg`)
        card.style.setProperty('--tilt-gx', `${(px * 100).toFixed(1)}%`)
        card.style.setProperty('--tilt-gy', `${(py * 100).toFixed(1)}%`)
    }

    function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
        if (e.pointerType !== 'mouse') {
            try {
                tiltRef.current?.setPointerCapture(e.pointerId)
            } catch {
                // setPointerCapture can throw on some browsers; the tilt still works.
            }
        }
    }

    function onPointerLeave(e: ReactPointerEvent<HTMLDivElement>) {
        if (e.pointerType === 'mouse') reset()
    }

    return (
        <div
            ref={tiltRef}
            className={cn('t-tilt', className)}
            onPointerMove={track}
            onPointerDown={onPointerDown}
            onPointerUp={reset}
            onPointerCancel={reset}
            onPointerLeave={onPointerLeave}
        >
            <div ref={cardRef} className={cn('t-tilt-card', cardClassName)}>
                {children}
                <div className="t-tilt-glare" aria-hidden />
            </div>
        </div>
    )
}
