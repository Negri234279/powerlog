/**
 * OpenTelemetry bootstrap. MUST be imported before anything that pulls in
 * http/express/pg/graphql (i.e. the very first import in main.ts), so the
 * auto-instrumentations can patch those modules as they load.
 *
 * Fully configured from the validated `env` (no direct process.env). Exports
 * traces via OTLP/HTTP to Tempo. Set OTEL_SDK_DISABLED=true (or an empty
 * OTEL_EXPORTER_OTLP_ENDPOINT) to turn it off.
 */
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

import { env } from './config/env'
import { APP_VERSION } from './version'

let sdk: NodeSDK | undefined

if (!env.OTEL_SDK_DISABLED && env.OTEL_EXPORTER_OTLP_ENDPOINT !== '') {
    sdk = new NodeSDK({
        // Resource metadata stamped on every span (and on metrics if exported):
        // the service name, the deployed app version, and the deployment stage.
        resource: resourceFromAttributes({
            [ATTR_SERVICE_NAME]: env.OTEL_SERVICE_NAME,
            [ATTR_SERVICE_VERSION]: APP_VERSION,
            'deployment.environment.name': env.APP_ENV,
        }),
        traceExporter: new OTLPTraceExporter({
            url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
        }),
        instrumentations: [
            getNodeAutoInstrumentations({
                // Drop noisy instrumentations: fs (huge span volume) and the
                // per-middleware spans. Express 5 routes via the `router` package, so
                // those spans come from instrumentation-router (not -express).
                '@opentelemetry/instrumentation-fs': { enabled: false },
                '@opentelemetry/instrumentation-express': { enabled: false },
                '@opentelemetry/instrumentation-router': { enabled: false },
            }),
        ],
    })

    sdk.start()
}

/**
 * Flush and shut down the OpenTelemetry SDK. Called from Nest's
 * `onApplicationShutdown` (after in-flight requests have drained and the DB pool
 * has closed) so the process can exit cleanly on its own — no forced
 * `process.exit`, which previously raced Nest's graceful shutdown. No-op when
 * telemetry is disabled.
 */
export async function shutdownTelemetry(): Promise<void> {
    await sdk?.shutdown()
}
