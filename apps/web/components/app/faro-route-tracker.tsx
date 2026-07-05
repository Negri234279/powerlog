'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

import { faroApi } from '@/lib/analytics/faro'

// UUIDs / numeric path segments → ':id' so view names stay low-cardinality
// (Loki labels and dashboard breakdowns must never see raw ids).
const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NUMERIC_SEGMENT = /^\d+$/

function toViewName(pathname: string): string {
    const sanitized = pathname
        .split('/')
        .map((segment) => (UUID_SEGMENT.test(segment) || NUMERIC_SEGMENT.test(segment) ? ':id' : segment))
        .join('/')

    return sanitized || '/'
}

/**
 * Keeps Faro's `view` meta in sync with App Router navigations (the SDK only
 * sees the initial load by itself). Each change emits a `view_changed` event
 * and stamps subsequent signals with the current view. Renders nothing.
 */
export function FaroRouteTracker() {
    const pathname = usePathname()

    useEffect(() => {
        if (!pathname) return

        faroApi()?.setView({ name: toViewName(pathname) })
    }, [pathname])

    return null
}
