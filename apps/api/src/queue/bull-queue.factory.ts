import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common'
import { type Processor, Queue, Worker, type WorkerOptions } from 'bullmq'
import type { Redis } from 'ioredis'
import { PinoLogger } from 'nestjs-pino'

import { REDIS, type RedisClient } from '../redis/redis.module'

/**
 * The shared BullMQ plumbing: it owns the Redis connections a queue needs and
 * their lifecycle, so a feature that wants a durable queue writes only its job and
 * its processor — not the connection handling every queue would otherwise repeat.
 *
 * **Connections are duplicated from the shared client** (one place owns the URL and
 * options — the Redis rule), one per Queue and one per Worker, because a BullMQ
 * worker holds a blocking connection that cannot also serve `add`. BullMQ does not
 * close connections it was handed, so this factory quits them on shutdown, after
 * closing the queues and workers that use them.
 *
 * Only the plumbing lives here. The retry/backoff policy and the in-process
 * fallback for when Redis is absent stay with each queue — those differ per use and
 * are not worth generalising from a single one yet.
 */
@Injectable()
export class BullQueueFactory implements OnApplicationShutdown {
    private readonly connections: Redis[] = []
    private readonly closeables: { close(): Promise<void> }[] = []

    constructor(
        @Inject(REDIS) private readonly redis: RedisClient,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(BullQueueFactory.name)
    }

    /** Whether durable queues can be created at all. False → callers fall back to
     *  their in-process behaviour, exactly like every other Redis-backed feature. */
    get available(): boolean {
        return this.redis !== null
    }

    createQueue<T>(name: string): Queue<T> {
        const queue = new Queue<T>(name, { connection: this.connection() })
        this.closeables.push(queue)

        return queue
    }

    createWorker<T>(name: string, processor: Processor<T>, options?: Omit<WorkerOptions, 'connection'>): Worker<T> {
        const worker = new Worker<T>(name, processor, { ...options, connection: this.connection() })
        this.closeables.push(worker)

        return worker
    }

    private connection(): Redis {
        if (!this.redis) throw new Error('BullQueueFactory used without Redis — check `available` first.')

        // BullMQ mutates its connection, so it gets its own duplicate rather than the
        // shared client; the duplicate inherits the client's options (incl. the
        // `maxRetriesPerRequest: null` BullMQ requires).
        const connection = this.redis.duplicate()
        this.connections.push(connection)

        return connection
    }

    async onApplicationShutdown(): Promise<void> {
        // Queues and workers first (they stop using their connections), then the
        // connections themselves — the order BullMQ expects on a clean shutdown.
        for (const closeable of this.closeables) {
            await closeable.close().catch((err: unknown) => this.logger.warn({ err }, 'error closing a queue/worker'))
        }
        for (const connection of this.connections) {
            await connection.quit().catch((err: unknown) => this.logger.warn({ err }, 'error quitting a connection'))
        }
    }
}
