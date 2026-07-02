// PostHog browser SDK bootstrap. Next.js (15.3+) runs this file once on the
// client before the app hydrates — product analytics, session replay and Web
// Vitals all originate here and flow to PostHog Cloud through the same-origin
// /ingest proxy (see next.config.ts rewrites) so ad-blockers don't drop events.
//
// No-ops when NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is unset (e.g. local dev
// without a project), so the app runs fine before analytics is configured.
import posthog from 'posthog-js'

const token = process.env['NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN']

if (token) {
    posthog.init(token, {
        // Ingestion goes through our own origin (rewritten to PostHog in
        // next.config.ts); ui_host points the toolbar/links at the real app.
        api_host: '/ingest',
        ui_host: process.env['NEXT_PUBLIC_POSTHOG_UI_HOST'] ?? 'https://us.posthog.com',
        // Modern defaults bundle: history-change pageviews (App Router-aware),
        // pageleave, Web Vitals autocapture, and identified-only person profiles.
        defaults: '2026-01-30',
        // Privacy: this app has auth/profile forms — never record input
        // contents. maskAllInputs already defaults to true; we set it
        // explicitly so the intent is obvious and survives future edits.
        session_recording: {
            maskAllInputs: true,
        },
        // Fires once when the SDK finishes initialising — the real "functional"
        // signal, at app boot, never on each capture.
        loaded: () => {
            console.info('[powerlog] posthog analytics functional')
        },
    })
}
