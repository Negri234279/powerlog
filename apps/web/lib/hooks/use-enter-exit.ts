'use client'

import { useEffect, useState } from 'react'

/**
 * Drives the transitions.dev open/close pattern (`.is-open` / `.is-closing`) in
 * React. Flip `open`:
 *  - On open the element mounts in its rest (pre-open) state, then gets
 *    `.is-open` on the next frame so the enter transition runs from rest → open.
 *  - On close it gets `.is-closing` and stays mounted for `closeMs` (matching the
 *    CSS `--*-close-dur`) so the exit transition plays, then unmounts.
 *
 * Exit only plays when the element stays mounted with `open=false` (an
 * always-rendered overlay toggled via its `open` prop); a parent that
 * conditionally mounts it still gets the enter transition.
 *
 * `closeMs` must match the close duration in the CSS (`--modal-close-dur` /
 * `--dropdown-close-dur` = 150ms).
 */
export function useEnterExit(
    open: boolean,
    closeMs = 150,
): { mounted: boolean; className: 'is-open' | 'is-closing' | '' } {
    const [mounted, setMounted] = useState(open)
    const [active, setActive] = useState(open)

    useEffect(() => {
        if (open) {
            setMounted(true)
            // Next frame: flip to `.is-open` so the transition animates from the
            // resting pre-open state instead of starting already open.
            const raf = requestAnimationFrame(() => setActive(true))

            return () => cancelAnimationFrame(raf)
        }

        setActive(false)
        const timer = setTimeout(() => setMounted(false), closeMs)

        return () => clearTimeout(timer)
    }, [open, closeMs])

    const className = open ? (active ? 'is-open' : '') : 'is-closing'

    return { mounted, className }
}
