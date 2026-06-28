// Server-side OpenTelemetry for the web app. Next runs `register()` once per
// server runtime (Node + Edge) before handling requests. @vercel/otel wires the
// OTel SDK and auto-instruments fetch, so server-side calls to the API (e.g. the
// silent-refresh route handler) propagate `traceparent` — giving end-to-end
// web→api traces in Tempo.
//
// Configured entirely from standard OTEL_* env (read by @vercel/otel):
//   OTEL_SERVICE_NAME, OTEL_EXPORTER_OTLP_ENDPOINT (+ /v1/traces appended),
//   OTEL_EXPORTER_OTLP_PROTOCOL, OTEL_RESOURCE_ATTRIBUTES.
// No-ops without an OTLP endpoint, mirroring the API's tracing.ts guard.
import { registerOTel } from '@vercel/otel'

export function register(): void {
    if (!process.env['OTEL_EXPORTER_OTLP_ENDPOINT']) return

    registerOTel({ serviceName: process.env['OTEL_SERVICE_NAME'] ?? 'powerlog-web' })
}
