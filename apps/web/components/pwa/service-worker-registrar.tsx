'use client'

import { useEffect } from 'react'

/**
 * Registers the Web Push service worker (`/sw.js`) once per browser, after load so
 * it doesn't contend with the first render. Renders nothing. Mounted globally (in
 * the provider tree) so the app is installable and push-ready from any page,
 * marketing included. Best-effort: a browser without service workers (or a failed
 * registration) just doesn't get push — nothing else breaks.
 */
export function ServiceWorkerRegistrar() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return

        const register = () => {
            void navigator.serviceWorker
                .register('/sw.js', { scope: '/', updateViaCache: 'none' })
                .catch(() => undefined)
        }

        if (document.readyState === 'complete') {
            register()
            return
        }

        window.addEventListener('load', register)
        return () => window.removeEventListener('load', register)
    }, [])

    return null
}
