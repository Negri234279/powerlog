'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/cn'
import { useEnterExit } from '@/lib/hooks/use-enter-exit'
import { EllipsisVertical } from './icons'
import { TrackedButton } from './tracked'

export interface MenuItem {
    label: string
    onSelect: () => void
    destructive?: boolean
    /** Stable id for the `ui_click` event (e.g. `session-menu-delete`). */
    analyticsId: string
}

interface Coords {
    top: number
    left?: number
    right?: number
}

/**
 * Generic three-dot (kebab) dropdown menu. The popover is rendered in a portal
 * with fixed positioning so it always sits above sibling content (e.g. other
 * cards in a list) instead of being trapped in a card's stacking context.
 * Closes on Escape, outside click, or after selecting an item.
 */
export function Menu({
    items,
    label = 'Open menu',
    align = 'right',
    analyticsId,
}: {
    items: MenuItem[]
    label?: string
    align?: 'left' | 'right'
    /** Stable id for the trigger's `ui_click` event (e.g. `session-menu`). */
    analyticsId: string
}) {
    const [open, setOpen] = useState(false)
    const { mounted, className: stateClass } = useEnterExit(open)
    const [coords, setCoords] = useState<Coords | null>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    // Anchor the fixed popover to the button, and keep it pinned on scroll/resize.
    useLayoutEffect(() => {
        if (!open) return

        const update = () => {
            const button = buttonRef.current
            if (!button) return

            const rect = button.getBoundingClientRect()
            setCoords({
                top: rect.bottom + 4,
                ...(align === 'right' ? { right: window.innerWidth - rect.right } : { left: rect.left }),
            })
        }

        update()
        window.addEventListener('scroll', update, true)
        window.addEventListener('resize', update)

        return () => {
            window.removeEventListener('scroll', update, true)
            window.removeEventListener('resize', update)
        }
    }, [open, align])

    useEffect(() => {
        if (!open) return

        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Node
            if (buttonRef.current?.contains(target)) return
            if (menuRef.current?.contains(target)) return
            setOpen(false)
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

    return (
        <>
            <TrackedButton
                analyticsId={analyticsId}
                ref={buttonRef}
                type="button"
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setOpen((v) => !v)
                }}
                className="grid size-8 place-items-center rounded-full text-text-faint transition-colors duration-300 hover:bg-white/[0.06] hover:text-text"
            >
                <EllipsisVertical className="size-4" />
            </TrackedButton>

            {mounted && coords
                ? createPortal(
                      <div
                          ref={menuRef}
                          role="menu"
                          data-origin={align === 'right' ? 'top-right' : 'top-left'}
                          style={{ position: 'fixed', top: coords.top, left: coords.left, right: coords.right }}
                          className={cn(
                              't-dropdown z-50 min-w-36 overflow-hidden rounded-2xl bg-shell p-1 shadow-xl ring-1 ring-hairline',
                              stateClass,
                          )}
                      >
                          {items.map((item) => (
                              <TrackedButton
                                  analyticsId={item.analyticsId}
                                  key={item.label}
                                  type="button"
                                  role="menuitem"
                                  onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      setOpen(false)
                                      item.onSelect()
                                  }}
                                  className={cn(
                                      'block w-full rounded-xl px-3 py-2 text-left text-sm transition-colors duration-200',
                                      item.destructive
                                          ? 'text-text-dim hover:bg-ember/10 hover:text-ember'
                                          : 'text-text-dim hover:bg-white/[0.05] hover:text-text',
                                  )}
                              >
                                  {item.label}
                              </TrackedButton>
                          ))}
                      </div>,
                      document.body,
                  )
                : null}
        </>
    )
}
