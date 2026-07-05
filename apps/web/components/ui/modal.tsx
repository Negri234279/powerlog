'use client'

import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/cn'
import { useEnterExit } from '@/lib/hooks/use-enter-exit'
import { TrackedButton } from './tracked'

/**
 * Generic centered modal overlay. Handles the backdrop, Escape to close,
 * click-outside, and body scroll lock. Open/close motion uses the transitions.dev
 * modal transition (scale-up in, softer scale-down out) — the dialog stays
 * mounted through its exit so the close animation plays. Visual language matches
 * the app's shell/surface cards.
 */
export function Modal({
    open,
    onClose,
    labelledBy,
    className,
    children,
}: {
    open: boolean
    onClose: () => void
    /** id of the heading element, for aria-labelledby. */
    labelledBy?: string
    className?: string
    children: ReactNode
}) {
    const { mounted, className: stateClass } = useEnterExit(open)

    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKey)
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = previousOverflow
        }
    }, [open, onClose])

    if (!mounted || typeof document === 'undefined') return null

    return createPortal(
        <div
            className="fixed inset-0 z-50 grid place-items-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
        >
            {/* One shared id for every modal's backdrop: the current view meta
                already says WHICH dialog was dismissed. */}
            <TrackedButton
                analyticsId="modal-backdrop-close"
                type="button"
                aria-label="Close"
                onClick={onClose}
                className={cn('t-modal-backdrop absolute inset-0 cursor-default bg-bg/70 backdrop-blur-sm', stateClass)}
            />
            <div
                className={cn(
                    't-modal relative w-full max-w-md rounded-[1.75rem] bg-shell p-1.5 ring-1 ring-hairline shadow-2xl',
                    stateClass,
                    className,
                )}
            >
                <div className="inset-hi rounded-[calc(1.75rem-0.375rem)] bg-surface p-6">{children}</div>
            </div>
        </div>,
        document.body,
    )
}
