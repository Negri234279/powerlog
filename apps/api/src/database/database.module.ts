import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import type { Env } from '../config/env'
import * as schema from './schema'

/** Injection token for the Drizzle database client. */
export const DRIZZLE = Symbol('DRIZZLE')

/** Typed Drizzle client used throughout the API. */
export type Database = NodePgDatabase<typeof schema>

/** Injection token for the underlying pg Pool (used by health checks). */
export const PG_POOL = Symbol('PG_POOL')

@Global()
@Module({
    providers: [
        {
            provide: PG_POOL,
            inject: [ConfigService],
            useFactory: (config: ConfigService<Env, true>) =>
                new Pool({ connectionString: config.get('DATABASE_URL') }),
        },
        {
            provide: DRIZZLE,
            inject: [PG_POOL],
            useFactory: (pool: Pool): Database => drizzle(pool, { schema }),
        },
    ],
    exports: [DRIZZLE, PG_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
    constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

    // onApplicationShutdown runs *after* Nest disposes the HTTP server, so the
    // pool stays open while in-flight requests drain and only closes once
    // they're done. onModuleDestroy would run too early (before the drain) and
    // break requests still querying the DB.
    async onApplicationShutdown(): Promise<void> {
        await this.pool.end()
    }
}
