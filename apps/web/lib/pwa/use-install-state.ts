'use client'

import { useEffect, useState } from 'react'

export interface InstallState {
    /** Running as an installed PWA (home-screen app), not a browser tab. */
    isStandalone: boolean
    /** iOS/iPadOS — where push only works once installed to the home screen. */
    isIOS: boolean
}

/**
 * Detects whether the app is running installed (standalone) and whether we're on
 * iOS — the two facts that decide the push story on Apple devices, where Web Push
 * is only available to an installed PWA (16.4+). Resolved in an effect (needs
 * `navigator`/`matchMedia`), so it reads `{ false, false }` on the server and the
 * first client render.
 */
export function useInstallState(): InstallState {
    const [state, setState] = useState<InstallState>({ isStandalone: false, isIOS: false })

    useEffect(() => {
        const ua = navigator.userAgent
        const isIOS = /iphone|ipad|ipod/i.test(ua) && !('MSStream' in window)
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            // iOS Safari's legacy home-screen flag (predates display-mode).
            (navigator as Navigator & { standalone?: boolean }).standalone === true

        setState({ isIOS, isStandalone })
    }, [])

    return state
}
