import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { PinoLogger } from 'nestjs-pino'

import { DRIZZLE, type Database } from '../database/database.module'
import { REDIS, type RedisClient } from '../redis/redis.module'

/** Redis is optional and every feature that uses it degrades gracefully, so its
 *  state is reported but never fails the check — see below. */
type RedisStatus = 'up' | 'down' | 'not_configured'

type HealthStatus = {
    status: 'ok'
    info: { database: 'up'; redis: RedisStatus }
    uptime: number
}

/**
 * Liveness/readiness endpoint. Pings the DB with `SELECT 1`.
 * Returns 200 when healthy, 503 (ServiceUnavailable) when the DB is down.
 */
@Controller('health')
export class HealthController {
    constructor(
        @Inject(DRIZZLE) private readonly db: Database,
        @Inject(REDIS) private readonly redis: RedisClient,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(HealthController.name)
    }

    @Get()
    async check(): Promise<HealthStatus> {
        try {
            await this.db.execute(sql`select 1`)
        } catch (error: unknown) {
            // Surface the underlying DB error — the GlobalExceptionFilter only
            // sees the ServiceUnavailableException below, so without this the
            // real cause (connection refused, auth failed, …) is lost.
            this.logger.error({ err: error }, 'database health check failed')

            throw new ServiceUnavailableException({
                status: 'error',
                info: { database: 'down' },
            })
        }

        return {
            status: 'ok',
            info: { database: 'up', redis: this.redisStatus() },
            uptime: process.uptime(),
        }
    }

    /**
     * Deliberately does NOT fail the check: the API serves every request fine
     * without Redis (realtime fan-out just stays local to this instance), and
     * pulling the container out of rotation over it would turn a degradation into
     * an outage. The `powerlog_redis_up` gauge is what alerts on it.
     */
    private redisStatus(): RedisStatus {
        if (!this.redis) return 'not_configured'

        return this.redis.status === 'ready' ? 'up' : 'down'
    }
}
