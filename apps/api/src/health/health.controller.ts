import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common'
import { sql } from 'drizzle-orm'

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
    constructor(@Inject(DRIZZLE) private readonly db: Database) {}

    @Get()
    async check(): Promise<HealthStatus> {
        try {
            await this.db.execute(sql`select 1`)
        } catch {
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
