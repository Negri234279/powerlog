import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { GetUserBillingQuery } from '../../../../../shared/contracts/get-user-billing.query'
import { FakeClock, InMemoryAdminSubscriptionReadModel } from '../../../../../../tests/doubles/billing'
import type { AdminSubscriptionRow } from '../../ports/admin-subscription.read-model'
import { GetUserBillingHandler } from './get-user-billing.handler'

const NOW = new Date('2026-07-01T00:00:00.000Z')
const userId = randomUUID()

/** A subscription row with sensible defaults; override only what a case cares about. */
function row(overrides: Partial<AdminSubscriptionRow> = {}): AdminSubscriptionRow {
    return {
        id: randomUUID(),
        userId,
        planId: randomUUID(),
        planSlug: 'pro-athlete',
        planName: 'Pro',
        gateway: 'stripe',
        status: 'active',
        amountCents: 1000,
        currency: 'EUR',
        interval: 'month',
        currentPeriodStart: new Date('2026-06-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-08-01T00:00:00.000Z'),
        cancelAtPeriodEnd: false,
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        ...overrides,
    }
}

function handlerWith(...rows: AdminSubscriptionRow[]): GetUserBillingHandler {
    const readModel = new InMemoryAdminSubscriptionReadModel().seed(...rows)
    return new GetUserBillingHandler(readModel, new FakeClock(NOW))
}

describe('GetUserBillingHandler', () => {
    it('should_normalise_yearly_and_monthly_prices_to_a_monthly_mrr', async () => {
        // 1000/mo + 12000/yr (→1000/mo) = 2000/mo.
        const handler = handlerWith(
            row({ interval: 'month', amountCents: 1000 }),
            row({ interval: 'year', amountCents: 12000 }),
        )

        const result = await handler.execute(new GetUserBillingQuery(userId))

        expect(result.mrrCents).toBe(2000)
        expect(result.currency).toBe('EUR')
    })

    it('should_exclude_manual_grants_from_mrr_but_still_list_them', async () => {
        const handler = handlerWith(row({ gateway: 'manual', amountCents: null, currency: null, interval: null }))

        const result = await handler.execute(new GetUserBillingQuery(userId))

        expect(result.subscriptions).toHaveLength(1)
        expect(result.mrrCents).toBe(0)
        expect(result.currency).toBeNull()
    })

    it('should_count_a_canceled_subscription_while_its_paid_period_is_still_running', async () => {
        const handler = handlerWith(row({ status: 'canceled', currentPeriodEnd: new Date('2026-08-01T00:00:00.000Z') }))

        const result = await handler.execute(new GetUserBillingQuery(userId))

        expect(result.mrrCents).toBe(1000)
    })

    it('should_not_count_a_canceled_subscription_whose_period_has_elapsed', async () => {
        const handler = handlerWith(row({ status: 'canceled', currentPeriodEnd: new Date('2026-06-15T00:00:00.000Z') }))

        const result = await handler.execute(new GetUserBillingQuery(userId))

        expect(result.mrrCents).toBe(0)
    })

    it('should_ignore_incomplete_and_expired_subscriptions_in_mrr', async () => {
        const handler = handlerWith(row({ status: 'incomplete' }), row({ status: 'expired' }))

        const result = await handler.execute(new GetUserBillingQuery(userId))

        expect(result.subscriptions).toHaveLength(2)
        expect(result.mrrCents).toBe(0)
    })

    it('should_return_the_subscriptions_newest_first', async () => {
        const older = row({ createdAt: new Date('2026-01-01T00:00:00.000Z') })
        const newer = row({ createdAt: new Date('2026-06-01T00:00:00.000Z') })
        const handler = handlerWith(older, newer)

        const result = await handler.execute(new GetUserBillingQuery(userId))

        expect(result.subscriptions.map((s) => s.id)).toEqual([newer.id, older.id])
    })
})
