import type { CommandBus } from '@nestjs/cqrs'
import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryWebhookEventStore } from '../../../../../../tests/doubles/billing'
import { silentLogger } from '../../../../../../tests/doubles/shared'
import { RetryWebhookEventCommand } from '../retry-webhook-event/retry-webhook-event.command'
import { RetryFailedWebhookCommand } from './retry-failed-webhook.command'
import { RetryFailedWebhookHandler } from './retry-failed-webhook.handler'

/**
 * One backoff attempt. The property that matters is that it is status-aware: it
 * shares the event with the on-creation invoice recovery and the admin replay, and
 * must never re-run one that is already done — nor keep the queue retrying it.
 */
describe('a backoff retry of a failed webhook', () => {
    let events: InMemoryWebhookEventStore
    let dispatched: RetryWebhookEventCommand[]
    let bus: CommandBus

    beforeEach(() => {
        events = new InMemoryWebhookEventStore()
        dispatched = []
        bus = {
            execute: async (command: RetryWebhookEventCommand) => {
                dispatched.push(command)
            },
        } as unknown as CommandBus
    })

    const handler = () => new RetryFailedWebhookHandler(events, bus, silentLogger())

    const seedFailed = async () => {
        await events.record({
            gateway: 'paypal',
            eventId: 'evt_1',
            type: 'PAYMENT.SALE.COMPLETED',
            payload: { kind: 'invoice' },
        })
        await events.markFailed('paypal', 'evt_1', 'invoice has no subscriber yet')
    }

    it('replays the event while it is still failed', async () => {
        await seedFailed()

        await handler().execute(new RetryFailedWebhookCommand('paypal', 'evt_1'))

        expect(dispatched).toHaveLength(1)
        expect(dispatched[0]).toBeInstanceOf(RetryWebhookEventCommand)
        // Resolved from the current row, not carried in the job.
        expect(dispatched[0]?.eventId).toBe('paypal:evt_1')
    })

    it('does nothing once the event has been processed by someone else', async () => {
        // The on-creation recovery or the admin replay may have got there first.
        await seedFailed()
        await events.markProcessed('paypal', 'evt_1', new Date())

        await handler().execute(new RetryFailedWebhookCommand('paypal', 'evt_1'))

        expect(dispatched).toEqual([])
    })

    it('does nothing when the event is gone', async () => {
        await handler().execute(new RetryFailedWebhookCommand('paypal', 'missing'))

        expect(dispatched).toEqual([])
    })

    it('propagates a still-failing replay so the queue backs off', async () => {
        await seedFailed()
        bus = {
            execute: async () => {
                throw new Error('still no subscriber')
            },
        } as unknown as CommandBus

        await expect(handler().execute(new RetryFailedWebhookCommand('paypal', 'evt_1'))).rejects.toThrow(
            /still no subscriber/,
        )
    })
})
