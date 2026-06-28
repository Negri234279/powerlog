import { join } from 'node:path'

import type { NextConfig } from 'next'

// Server-side proxy target (the API). Kept off NEXT_PUBLIC_* on purpose: the
// browser only ever talks to the web origin via /api/*, which makes the API's
// HTTPOnly auth cookies first-party (so proxy can read them) and sidesteps
// CORS entirely. In compose this is http://api:4000.
const apiInternalUrl = process.env['API_INTERNAL_URL'] ?? 'http://localhost:4000'

// PostHog Cloud ingest + static-asset hosts (US region by default). The browser
// only ever hits same-origin /ingest/*; Next rewrites those here so ad-blockers
// don't drop analytics and everything stays first-party. The assets host is the
// regional *-assets domain, derived from the ingest host unless overridden.
const posthogHost = process.env['NEXT_PUBLIC_POSTHOG_HOST'] ?? 'https://us.i.posthog.com'
const posthogAssetsHost =
    process.env['POSTHOG_ASSETS_HOST'] ??
    posthogHost.replace('://us.', '://us-assets.').replace('://eu.', '://eu-assets.')

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
    // PostHog's recorder relies on trailing slashes on /ingest/* being preserved.
    skipTrailingSlashRedirect: true,
    async rewrites() {
        return [
            // PostHog reverse proxy: static assets + recorder array first, then
            // the catch-all to the ingestion API.
            { source: '/ingest/static/:path*', destination: `${posthogAssetsHost}/static/:path*` },
            { source: '/ingest/array/:path*', destination: `${posthogAssetsHost}/array/:path*` },
            { source: '/ingest/:path*', destination: `${posthogHost}/:path*` },
            // BFF proxy: the browser hits same-origin /api/*, Next forwards to the API.
            { source: '/api/:path*', destination: `${apiInternalUrl}/:path*` },
        ]
    },
}

export default nextConfig
