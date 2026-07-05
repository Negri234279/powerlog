'use client'

import Link from 'next/link'
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEvent, Ref } from 'react'

import { track } from '@/lib/analytics/events'

// The base interactive primitives — EVERY clickable <button>/<a> in the app
// renders through one of these, never a bare element (enforced by convention;
// grep for `<button` / `<a ` outside this file to audit). Each click emits a
// single `ui_click { id, kind }` event, so coverage of "which controls get
// used" is total by construction, not per-callsite discipline.
//
// `analyticsId` is REQUIRED and must be a stable kebab-case literal
// (`nav-register`, `session-delete`): it's the whole dashboard breakdown key,
// so keep the set finite — never interpolate user data or row ids into it.

interface TrackedButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    analyticsId: string
    ref?: Ref<HTMLButtonElement>
    /** When the action runs on `onMouseDown` and unmounts the button before
     *  mouseup (e.g. combobox items racing an input's blur), the browser never
     *  fires `click` — set 'mousedown' so the event isn't lost. */
    trackOn?: 'click' | 'mousedown'
}

/** `<button>` with click telemetry. Same semantics as the bare element
 *  (including `type` defaulting to submit inside forms — pass `type="button"`
 *  explicitly for non-submit actions, exactly as before). */
export function TrackedButton({ analyticsId, onClick, onMouseDown, trackOn = 'click', ...rest }: TrackedButtonProps) {
    function handleClick(event: MouseEvent<HTMLButtonElement>) {
        if (trackOn === 'click') track('ui_click', { id: analyticsId, kind: 'button' })
        onClick?.(event)
    }

    function handleMouseDown(event: MouseEvent<HTMLButtonElement>) {
        if (trackOn === 'mousedown') track('ui_click', { id: analyticsId, kind: 'button' })
        onMouseDown?.(event)
    }

    return <button data-analytics-id={analyticsId} onClick={handleClick} onMouseDown={handleMouseDown} {...rest} />
}

interface TrackedLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    analyticsId: string
    href: string
    ref?: Ref<HTMLAnchorElement>
}

/** Anchor with click telemetry. Internal paths ("/…") render a Next `<Link>`
 *  (client navigation + prefetch); external URLs and hash anchors render a
 *  plain `<a>`. */
export function TrackedLink({ analyticsId, href, onClick, ...rest }: TrackedLinkProps) {
    function handleClick(event: MouseEvent<HTMLAnchorElement>) {
        track('ui_click', { id: analyticsId, kind: 'link' })
        onClick?.(event)
    }

    if (href.startsWith('/')) {
        return <Link href={href} data-analytics-id={analyticsId} onClick={handleClick} {...rest} />
    }

    return <a href={href} data-analytics-id={analyticsId} onClick={handleClick} {...rest} />
}
