// Grafana Faro bootstrap. Next.js runs this file once on the client before the
// app hydrates — RUM (Web Vitals, JS errors, session/view events, ui_click /
// product events) and browser traces all originate here and flow to Alloy's
// faro.receiver through the same-origin /faro proxy (see next.config.ts
// rewrites) so ad-blockers don't drop events and nothing needs CORS.
//
// No-ops in dev unless NEXT_PUBLIC_FARO_DEV=true (see lib/analytics/faro.ts),
// so the app runs fine without the local observability stack.
import { faroApi, initFaro } from '@/lib/analytics/faro'

initFaro()

if (faroApi()) {
    // Fires once at app boot — the real "functional" signal, never per capture.
    console.info('[powerlog] faro telemetry functional')
}
