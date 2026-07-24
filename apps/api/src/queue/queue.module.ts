import { Global, Module } from '@nestjs/common'

import { BullQueueFactory } from './bull-queue.factory'

/**
 * Shared BullMQ plumbing, global like {@link RedisModule} it builds on: any feature
 * module can inject {@link BullQueueFactory} to create a durable queue without
 * owning connection handling. Optional by inheritance — with `REDIS_URL` unset the
 * factory reports `available === false` and callers use their in-process fallback.
 */
@Global()
@Module({
    providers: [BullQueueFactory],
    exports: [BullQueueFactory],
})
export class QueueModule {}
