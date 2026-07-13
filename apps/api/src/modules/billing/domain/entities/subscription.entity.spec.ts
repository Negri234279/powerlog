import { describe, expect, it } from 'vitest'

import type { SubscriptionStatus } from '../subscription-status'
import { SubscriptionAggregate } from './subscription.entity'

const PERIOD_START = new Date('2026-07-01T00:00:00.000Z')
const PERIOD_END = new Date('2026-08-01T00:00:00.000Z')
const INSIDE_PERIOD = new Date('2026-07-15T00:00:00.000Z')
const AFTER_PERIOD = new Date('2026-08-02T00:00:00.000Z')

function subscription(status: SubscriptionStatus): SubscriptionAggregate {
    return SubscriptionAggregate.create({
        id: 's-1',
        userId: 'u-1',
        planId: 'p-1',
        gateway: 'stripe',
        status,
        currentPeriodStart: PERIOD_START,
        currentPeriodEnd: PERIOD_END,
        now: PERIOD_START,
    })
}

describe('SubscriptionAggregate.isEntitledAt', () => {
    it.each<SubscriptionStatus>(['trialing', 'active', 'past_due'])('entitles a %s subscription', (status) => {
        expect(subscription(status).isEntitledAt(INSIDE_PERIOD)).toBe(true)
    })

    it('keeps a past_due subscription entitled while the gateway retries the charge', () => {
        // Dunning: cutting access on the first failed charge would punish an expired
        // card. When the gateway gives up, it sends the cancellation webhook instead.
        expect(subscription('past_due').isEntitledAt(INSIDE_PERIOD)).toBe(true)
    })

    it('keeps a canceled subscription entitled until the period it already paid for ends', () => {
        expect(subscription('canceled').isEntitledAt(INSIDE_PERIOD)).toBe(true)
    })

    it('drops a canceled subscription once that period has elapsed', () => {
        expect(subscription('canceled').isEntitledAt(AFTER_PERIOD)).toBe(false)
    })

    it('does not entitle a checkout that was never completed', () => {
        expect(subscription('incomplete').isEntitledAt(INSIDE_PERIOD)).toBe(false)
    })

    it('does not entitle an expired subscription, even inside the old period', () => {
        // `expired` is the gateway's verdict; the dates are only history at that point.
        expect(subscription('expired').isEntitledAt(INSIDE_PERIOD)).toBe(false)
    })
})
