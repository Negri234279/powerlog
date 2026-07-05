'use client'

import type { Route } from 'next'
import { type ReactNode, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { Plus } from './icons'
import { TrackedButton, TrackedLink } from './tracked'

export interface PlusMenuItem {
    label: string
    icon?: ReactNode
    href?: Route
    onClick?: () => void
    /** Stable id for the `ui_click` event (e.g. `quick-new-session`). */
    analyticsId: string
}

const ITEM_H = 44
const PAD = 12
const WIDTH = 224

/**
 * A circular "+" trigger that morphs into the action panel it opens
 * (transitions.dev `20-plus-menu-morph`): the box grows up-and-left out of the
 * button, the corner radius relaxes, the plus rotates/fades out and the menu
 * slides in. The open size is written inline so it fits the items. Closes on
 * outside click / Escape.
 */
export function PlusMenuMorph({
    items,
    label = 'Quick actions',
    className,
    analyticsId,
}: {
    items: PlusMenuItem[]
    label?: string
    className?: string
    /** Stable id for the trigger's `ui_click` event (e.g. `quick-actions`). */
    analyticsId: string
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return

        const onPointerDown = (e: PointerEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false)
        }

        document.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('keydown', onKey)

        return () => {
            document.removeEventListener('pointerdown', onPointerDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    const openSize = open ? { width: WIDTH, height: items.length * ITEM_H + PAD } : undefined

    const itemClass =
        'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-text-dim transition-colors duration-200 hover:bg-white/[0.06] hover:text-text'

    return (
        <div
            ref={ref}
            data-open={open}
            style={openSize}
            className={cn('t-morph bg-shell shadow-xl ring-1 ring-hairline', open ? 'shadow-2xl' : '', className)}
        >
            <div className="t-morph-menu p-2" role="menu" aria-label={label}>
                {items.map((item) =>
                    item.href ? (
                        <TrackedLink
                            analyticsId={item.analyticsId}
                            key={item.label}
                            href={item.href}
                            role="menuitem"
                            className={itemClass}
                            onClick={() => setOpen(false)}
                        >
                            {item.icon ? <span className="text-text-faint">{item.icon}</span> : null}
                            {item.label}
                        </TrackedLink>
                    ) : (
                        <TrackedButton
                            analyticsId={item.analyticsId}
                            key={item.label}
                            type="button"
                            role="menuitem"
                            className={cn(itemClass, 'w-full')}
                            onClick={() => {
                                setOpen(false)
                                item.onClick?.()
                            }}
                        >
                            {item.icon ? <span className="text-text-faint">{item.icon}</span> : null}
                            {item.label}
                        </TrackedButton>
                    ),
                )}
            </div>

            <TrackedButton
                analyticsId={analyticsId}
                type="button"
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={(e) => {
                    e.stopPropagation()
                    setOpen((o) => !o)
                }}
                className="t-morph-plus"
            >
                <Plus className="size-5 text-ember" />
            </TrackedButton>
        </div>
    )
}
