import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { getToken } from '@willsoto/nestjs-prometheus'
import { Redis } from 'ioredis'
import { PinoLogger } from 'nestjs-pino'
import type { Gauge } from 'prom-client'

import type { Env } from '../config/env'
import { METRIC } from '../observability/metrics'

/** Injection token for the shared Redis client — **`null` when `REDIS_URL` is
 *  unset**, which is the supported "no Redis" mode (see RedisModule). */
export const REDIS = Symbol('REDIS')

/** What consumers inject: always handle the `null` case. */
export type RedisClient = Redis | null

function createClient(url: string, up: Gauge<string>, logger: PinoLogger): Redis {
    const client = new Redis(url, {
        connectionName: 'powerlog-api',
        // Never give up on a command because the server is momentarily gone; the
        // retry strategy below decides when to reconnect. (BullMQ, coming later,
        // also requires exactly this.)
        maxRetriesPerRequest: null,
        // Fail commands fast while disconnected instead of buffering them in an
        // unbounded in-memory queue: every Redis-backed feature here is meant to
        // degrade, not to replay a backlog once the server returns.
        enableOfflineQueue: false,
        retryStrategy: (attempt) => Math.min(attempt * 200, 5_000),
    })

    // ioredis re-emits `error` on every reconnect attempt, so only log the
    // transitions — otherwise a Redis outage floods the logs.
    let wasUp = false
    const setUp = (isUp: boolean, event: string): void => {
        up.set(isUp ? 1 : 0)
        if (isUp === wasUp) return

        wasUp = isUp
        if (isUp) logger.info('redis connected')
        else logger.warn({ event }, 'redis connection lost — features fall back to in-process behaviour')
    }

    client.on('ready', () => setUp(true, 'ready'))
    client.on('end', () => setUp(false, 'end'))
    client.on('error', (err: Error) => setUp(false, err.message))

    return client
}

/**
 * The shared Redis connection. **Optional by design**: with `REDIS_URL` unset the
 * token resolves to `null` and every Redis-backed feature falls back to its
 * in-process implementation (today: realtime fan-out stays local to this
 * instance). That keeps `pnpm dev` without Docker and the test suites Redis-free,
 * and means a Redis outage in prod degrades the app instead of breaking it.
 *
 * Consumers that need their own connection (pub/sub subscribers, and BullMQ
 * later) should `.duplicate()` this client rather than build a second one from
 * the URL — one place owns the connection options.
 */
@Global()
@Module({
    providers: [
        {
            provide: REDIS,
            inject: [ConfigService, getToken(METRIC.redisUp), PinoLogger],
            useFactory: (config: ConfigService<Env, true>, up: Gauge<string>, logger: PinoLogger): RedisClient => {
                logger.setContext('Redis')
                const url = config.get('REDIS_URL', { infer: true })

                if (!url) {
                    logger.info('REDIS_URL not set — running without Redis (in-process fallbacks)')
                    up.set(0)

                    return null
                }

                return createClient(url, up, logger)
            },
        },
    ],
    exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
    constructor(@Inject(REDIS) private readonly client: RedisClient) {}

    // Runs after the HTTP server is disposed, like the pg pool: in-flight work
    // keeps its connection until the drain finishes.
    async onApplicationShutdown(): Promise<void> {
        await this.client?.quit()
    }
}
