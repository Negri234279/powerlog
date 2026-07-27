// Must be first: starts OpenTelemetry before http/express/pg/graphql load.
import './tracing'
import 'reflect-metadata'

import type { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import { Logger } from 'nestjs-pino'
import type { Server } from 'node:http'

import { AppModule } from './app.module'
import type { Env } from './config/env'
import { WsIoAdapter } from './gateway/ws-io-adapter'
import { REDIS } from './redis/redis.module'

async function bootstrap(): Promise<void> {
    // rawBody: keep the unparsed body (req.rawBody) so the Resend webhook can
    // verify its Svix signature against the exact bytes received.
    const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true })

    // Route all Nest logs through pino.
    app.useLogger(app.get(Logger))
    app.flushLogs()

    // Auth cookie is read in resolvers/guards; CORS must allow credentials.
    app.use(cookieParser())
    app.enableCors({ origin: true, credentials: true })
    app.enableShutdownHooks()

    const config = app.get(ConfigService<Env, true>)
    const port = config.get('API_PORT', { infer: true })
    const drainTimeoutMs = config.get('SHUTDOWN_DRAIN_TIMEOUT_MS', { infer: true })

    // Socket.IO shares this HTTP server (path '/ws'). engine.io validates the
    // handshake origin itself, so CORS is set on the adapter, not just enableCors.
    // The Redis adapter (rooms across instances) turns on only when REDIS_URL is set.
    const wsAdapter = new WsIoAdapter(app, app.get(REDIS), config.get('WEB_ORIGIN', { infer: true }))
    await wsAdapter.connectToRedis()
    app.useWebSocketAdapter(wsAdapter)

    await app.listen(port)

    setupGracefulDrain(app, drainTimeoutMs)

    app.get(Logger).log(`API listening on http://localhost:${port}/graphql`)
}

/**
 * Bound the graceful-shutdown drain so it can never hang the deploy.
 *
 * `enableShutdownHooks()` already drives the ordered teardown on SIGTERM
 * (drain HTTP → close DB pool → flush OTel). But Node's `server.close()` waits
 * for *all* sockets, and idle HTTP keep-alive connections never close on their
 * own — so without help the drain can stall until the orchestrator sends
 * SIGKILL. On the signal we therefore close idle connections immediately (so
 * `server.close()` only waits on genuine in-flight requests) and arm a watchdog
 * that force-closes everything and exits non-zero if the drain overruns its
 * window.
 */
function setupGracefulDrain(app: INestApplication, drainTimeoutMs: number): void {
    const server = app.getHttpServer() as Server
    const logger = app.get(Logger)

    // Reap idle keep-alive sockets quickly once draining; harmless while live.
    server.keepAliveTimeout = 5_000

    const onSignal = (signal: NodeJS.Signals): void => {
        // Let currently-idle keep-alive connections close so server.close()
        // only blocks on requests actually being served.
        server.closeIdleConnections()

        const watchdog = setTimeout(() => {
            logger.warn(
                { signal, drainTimeoutMs },
                'Graceful shutdown exceeded drain window; force-closing connections',
            )
            server.closeAllConnections()
            process.exit(1)
        }, drainTimeoutMs)

        // Don't let the watchdog itself keep the event loop alive.
        watchdog.unref()
    }

    process.once('SIGTERM', onSignal)
    process.once('SIGINT', onSignal)
}

void bootstrap()
