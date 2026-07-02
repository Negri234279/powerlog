import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common'
import { sql } from 'drizzle-orm'
import { PinoLogger } from 'nestjs-pino'

import { DRIZZLE, type Database } from '../database/database.module'

type HealthStatus = {
    status: 'ok'
    info: { database: 'up' }
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
            info: { database: 'up' },
            uptime: process.uptime(),
        }
    }
}
