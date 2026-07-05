// Grafana Faro bootstrap — RUM for the browser: Web Vitals, JS errors, session
// + view events and fetch traces, shipped to the same-origin /faro collector
// (rewritten to Alloy's faro.receiver in next.config.ts, mirroring the /api BFF
// proxy) so everything stays first-party and CORS-free.
//
// Enabled in production builds; in dev it no-ops unless NEXT_PUBLIC_FARO_DEV
// is 'true' (the local observability stack must be up for events to land).
import { faro, getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk'
import type { Faro } from '@grafana/faro-web-sdk'
import { TracingInstrumentation } from '@grafana/faro-web-tracing'

/** Same-origin collector path; next.config rewrites /faro/* to Alloy. */
export const FARO_COLLECTOR_URL = '/faro/collect'

function isEnabled(): boolean {
    if (process.env.NODE_ENV === 'production') return true

    return process.env['NEXT_PUBLIC_FARO_DEV'] === 'true'
}

/** Idempotent init, called once from instrumentation-client.ts. */
export function initFaro(): void {
    if (!isEnabled()) return

    // Hot-reload / double-eval guard: the SDK registers itself on the global.
    if ((faro as Partial<Faro>).api) return

    initializeFaro({
        url: FARO_COLLECTOR_URL,
        app: {
            name: 'powerlog-web',
            // Both inlined at build time from next.config.ts `env`.
            version: process.env['NEXT_PUBLIC_APP_VERSION'] ?? 'unknown',
            environment: process.env['NEXT_PUBLIC_APP_ENV'] ?? 'dev',
        },
        instrumentations: [
            // Errors, Web Vitals, session + view events. Console capture stays
            // off: errors are already caught and anything else is Loki noise.
            ...getWebInstrumentations({ captureConsole: false }),
            // Browser fetch/XHR spans → Tempo; same-origin /api/graphql calls
            // carry traceparent, so traces run browser → web proxy → API.
            new TracingInstrumentation(),
        ],
        // Never trace/instrument the telemetry channel itself.
        ignoreUrls: [/\/faro\/collect/],
    })
}

/**
 * The Faro API once initialised, else null (dev without the flag, SSR).
 * Callers use it with `?.` so telemetry is always a silent no-op when off.
 */
export function faroApi(): Faro['api'] | null {
    return (faro as Partial<Faro>).api ?? null
}
