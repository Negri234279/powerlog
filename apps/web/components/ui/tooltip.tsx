'use client'

import { type ReactNode, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/cn'
import { useEnterExit } from '@/lib/hooks/use-enter-exit'

/**
 * Hover/focus tooltip (transitions.dev `17-tooltip` — fade + scale). The bubble
 * is rendered in a portal with fixed positioning so it escapes any ancestor
 * `overflow: hidden` (e.g. a rounded table) instead of being clipped.
 */
export function Tooltip({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
    const wrapRef = useRef<HTMLSpanElement>(null)
    const [open, setOpen] = useState(false)
    const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
    const { mounted, className: stateClass } = useEnterExit(open, 80)

    function show() {
        const el = wrapRef.current
        if (!el) return

        const r = el.getBoundingClientRect()
        setCoords({ top: r.top - 8, left: r.left + r.width / 2 })
        setOpen(true)
    }

    return (
        <span
            ref={wrapRef}
            className={cn('inline-flex', className)}
            onPointerEnter={show}
            onPointerLeave={() => setOpen(false)}
            onFocus={show}
            onBlur={() => setOpen(false)}
        >
            {children}
            {mounted && coords && typeof document !== 'undefined'
                ? createPortal(
                      <span
                          role="tooltip"
                          style={{ top: coords.top, left: coords.left }}
                          className={cn('t-tooltip', stateClass)}
                      >
                          {label}
                      </span>,
                      document.body,
                  )
                : null}
        </span>
    )
}
