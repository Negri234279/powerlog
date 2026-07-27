import type { INestApplicationContext } from '@nestjs/common'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import type { Server, ServerOptions } from 'socket.io'

import type { RedisClient } from '../redis/redis.module'

/**
 * Socket.IO adapter for Nest, configured for this app:
 *  - `path: '/ws'`, mounted on the same HTTP server as the API (one process).
 *  - `transports: ['websocket']` — no long-polling, so no sticky sessions are
 *    needed with more than one replica, and less CPU on the Pi.
 *  - CORS with credentials for the web origin: engine.io validates `origin`
 *    itself, so `main.ts`'s `enableCors` does not cover the handshake.
 *  - the official Redis adapter when `REDIS_URL` is set, so rooms fan out across
 *    instances (`.duplicate()` the shared client — one place owns the options);
 *    without Redis it's the in-memory adapter, i.e. a single process.
 */
export class WsIoAdapter extends IoAdapter {
    private redisAdapter?: ReturnType<typeof createAdapter>

    constructor(
        app: INestApplicationContext,
        private readonly redis: RedisClient,
        private readonly corsOrigin: string,
    ) {
        super(app)
    }

    /** Build the Redis adapter from a duplicated pub/sub pair. No-op without Redis. */
    async connectToRedis(): Promise<void> {
        if (!this.redis) return

        const pubClient = this.redis.duplicate()
        const subClient = this.redis.duplicate()

        this.redisAdapter = createAdapter(pubClient, subClient)
    }

    override createIOServer(port: number, options?: ServerOptions): Server {
        const server = super.createIOServer(port, {
            ...options,
            path: '/ws',
            transports: ['websocket'],
            cors: { origin: this.corsOrigin, credentials: true },
        }) as Server

        if (this.redisAdapter) {
            server.adapter(this.redisAdapter)
        }

        return server
    }
}
