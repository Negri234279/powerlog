import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

// next-intl without URL routing: the locale is resolved per request in
// i18n/request.ts (cookie → session → Accept-Language → en).
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

// Server-side proxy target (the API). Kept off NEXT_PUBLIC_* on purpose: the
// browser only ever talks to the web origin via /api/*, which makes the API's
// HTTPOnly auth cookies first-party (so proxy can read them) and sidesteps
// CORS entirely. In compose this is http://api:4000.
const apiInternalUrl = process.env['API_INTERNAL_URL'] ?? 'http://localhost:4000'

// Grafana Faro collector (Alloy's faro.receiver). The browser only ever hits
// same-origin /faro/*; Next rewrites those here so telemetry stays first-party
// (no CORS, no ad-blocker drops). Like API_INTERNAL_URL, rewrites are baked at
// BUILD time — the Docker build overrides this ARG for the prod stack DNS name.
const faroInternalUrl = process.env['FARO_INTERNAL_URL'] ?? 'http://localhost:12347'

// Stamped on every Faro signal as app.version / app.environment (inlined into
// the client bundle via `env` below). APP_ENV mirrors the API's convention
// (dev|staging|prod); the Docker build sets it, local dev defaults to 'dev'.
const { version } = JSON.parse(readFileSync(join(import.meta.dirname, 'package.json'), 'utf8')) as {
    version: string
}
const appEnv = process.env['APP_ENV'] ?? 'dev'

// Extra hostnames allowed to reach the dev server (HMR / RSC / route handlers)
// when the app is opened from a non-localhost origin — e.g. a VS Code dev tunnel
// (`https://<id>-4115.<region>.devtunnels.ms`). Tunnel ids change per session, so
// set the exact host via ALLOWED_DEV_ORIGINS (comma-separated); the wildcards
// cover the common devtunnels regions. Dev-only; ignored in production builds.
const extraDevOrigins = (process.env['ALLOWED_DEV_ORIGINS'] ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

const nextConfig: NextConfig = {
    // Standalone server bundle for the production Docker image.
    output: 'standalone',
    allowedDevOrigins: ['*.devtunnels.ms', '*.uks1.devtunnels.ms', ...extraDevOrigins],
    // Trace files from the monorepo root so pnpm's symlinked deps are included.
    outputFileTracingRoot: join(import.meta.dirname, '../..'),
    reactStrictMode: true,
    skipTrailingSlashRedirect: true,
    experimental: {
        // The BFF proxy (the `/api/*` rewrite below) caps upstream requests at 30s
        // by default and aborts the socket. That used to be a problem: AI design
        // ran inside its mutation and took 20–120s, so the cap had to be lifted
        // past the API's own 120s provider timeout.
        //
        // It no longer does — generations are queued and the mutation returns in
        // milliseconds — so the only reason to keep any raise is headroom for a
        // slow-but-ordinary request. 30s is that, and a request still running at
        // 60s is a bug worth surfacing rather than waiting two minutes on (ms).
        proxyTimeout: 60_000,
    },
    env: {
        NEXT_PUBLIC_APP_VERSION: version,
        NEXT_PUBLIC_APP_ENV: appEnv,
    },
    async rewrites() {
        return [
            // Faro reverse proxy: browser RUM/traces → Alloy's faro.receiver.
            { source: '/faro/:path*', destination: `${faroInternalUrl}/:path*` },
            // BFF proxy: the browser hits same-origin /api/*, Next forwards to the API.
            { source: '/api/:path*', destination: `${apiInternalUrl}/:path*` },
        ]
    },
    async headers() {
        return [
            {
                // The service worker must never be cached (or a stale worker sticks
                // around after a deploy) and needs the /-scope header to control the
                // whole origin from a public/ path.
                source: '/sw.js',
                headers: [
                    { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
                    { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
                    { key: 'Service-Worker-Allowed', value: '/' },
                ],
            },
        ]
    },
}

export default withNextIntl(nextConfig)
