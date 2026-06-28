'use client'

import { useId } from 'react'

import { cn } from '@/lib/cn'
import { FormError } from './form-error'
import { Modal } from './modal'

/**
 * Generic confirmation dialog, reusable for any destructive (or neutral) action.
 * Pass `pending` to disable the buttons while the action runs and `error` to
 * surface a failure without closing.
 */
export function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
    pending = false,
    error,
}: {
    open: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    destructive?: boolean
    pending?: boolean
    error?: string | null
}) {
    const titleId = useId()

    return (
        <Modal open={open} onClose={onClose} labelledBy={titleId}>
            <h2 id={titleId} className="font-display text-h3 tracking-tight">
                {title}
            </h2>
            {description ? <p className="mt-2 text-sm text-text-dim">{description}</p> : null}
            <FormError error={error} className="mt-3" />

            <div className="mt-6 flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={pending}
                    className="rounded-full px-4 py-2 text-sm text-text-dim transition-colors duration-300 hover:text-text disabled:opacity-60"
                >
                    {cancelLabel}
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={pending}
                    className={cn(
                        'rounded-full px-4 py-2 text-sm font-medium ring-1 transition-colors duration-300 disabled:opacity-60',
                        destructive
                            ? 'bg-ember/15 text-ember ring-ember/30 hover:bg-ember/25'
                            : 'bg-pr/15 text-pr ring-pr/30 hover:bg-pr/25',
                    )}
                >
                    {pending ? 'Working…' : confirmLabel}
                </button>
            </div>
        </Modal>
    )
}
