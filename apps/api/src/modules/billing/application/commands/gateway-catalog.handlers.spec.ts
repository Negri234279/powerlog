import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    FakeGatewayProvider,
    FakeIdGenerator,
    FakePaymentGateway,
    InMemoryPlanOfferRepository,
    InMemoryPlanPriceRepository,
    InMemoryPlanRepository,
} from '../../../../../tests/doubles/billing'
import { silentLogger } from '../../../../../tests/doubles/shared'
import { PlanMother } from '../../../../../tests/mothers/billing'
import { PlanPriceEntity } from '../../domain/entities/plan-price.entity'
import { GatewayNotConfiguredError, InvalidPlanOfferError } from '../../domain/errors/billing.errors'
import { SyncPlanCommand } from './sync-plan/sync-plan.command'
import { SyncPlanHandler } from './sync-plan/sync-plan.handler'
import { UpsertPlanOfferCommand } from './upsert-plan-offer/upsert-plan-offer.command'
import { UpsertPlanOfferHandler } from './upsert-plan-offer/upsert-plan-offer.handler'

const NOW = new Date('2026-07-15T00:00:00.000Z')
const PLAN = PlanMother.athletePro()

function aPrice(id: string, active = true): PlanPriceEntity {
    const price = PlanPriceEntity.create({
        id,
        planId: PLAN.id,
        interval: 'month',
        currency: id.includes('usd') ? 'USD' : 'EUR',
        amountCents: 799,
        now: NOW,
    })
    if (!active) price.deactivate(NOW)

    return price
}

describe('publishing the catalog to a gateway', () => {
    let plans: InMemoryPlanRepository
    let prices: InMemoryPlanPriceRepository
    let offers: InMemoryPlanOfferRepository
    let gateway: FakePaymentGateway
    let clock: FakeClock

    beforeEach(() => {
        plans = new InMemoryPlanRepository([PlanMother.athletePro()])
        prices = new InMemoryPlanPriceRepository()
        offers = new InMemoryPlanOfferRepository()
        gateway = new FakePaymentGateway()
        clock = new FakeClock(NOW)
    })

    const sync = () =>
        new SyncPlanHandler(plans, prices, offers, new FakeGatewayProvider(gateway), clock, silentLogger())
    const upsertOffer = () => new UpsertPlanOfferHandler(plans, offers, clock, new FakeIdGenerator(), silentLogger())

    it('stores the ids the gateway hands back, so a checkout has something to point at', async () => {
        await prices.save(aPrice('price-eur'))

        await sync().execute(new SyncPlanCommand(PLAN.id, 'stripe'))

        expect((await plans.findById(PLAN.id))?.stripeProductId).toBe('prod_athlete-pro')
        expect((await prices.findById('price-eur'))?.stripePriceId).toBe('px_price-eur')
    })

    it('never republishes a price that already has an id — that is the one somebody is being billed on', async () => {
        const price = aPrice('price-eur')
        price.syncedToStripe('px_original', NOW)
        await prices.save(price)

        await sync().execute(new SyncPlanCommand(PLAN.id, 'stripe'))

        expect((await prices.findById('price-eur'))?.stripePriceId).toBe('px_original')
    })

    it('leaves withdrawn prices out: a price taken off sale must not reappear at the gateway', async () => {
        await prices.save(aPrice('price-eur'))
        await prices.save(aPrice('price-old', false))

        await sync().execute(new SyncPlanCommand(PLAN.id, 'stripe'))

        expect((await prices.findById('price-old'))?.stripePriceId).toBeNull()
    })

    it('publishes the plan offer and keeps the discount it created', async () => {
        await prices.save(aPrice('price-eur'))
        const offerId = await upsertOffer().execute(
            new UpsertPlanOfferCommand(PLAN.id, 'Launch', 14, { cycles: 3, percentOff: 50 }, NOW, null),
        )

        await sync().execute(new SyncPlanCommand(PLAN.id, 'stripe'))

        expect((await offers.findById(offerId))?.stripeCouponId).toBe(`cpn_${offerId}`)
    })

    it('refuses cleanly when the environment has no keys for that gateway', async () => {
        // Not a crash: with no STRIPE_SECRET_KEY the app still runs, it just cannot
        // take money — dev and CI live here.
        gateway.unconfigured()

        await expect(sync().execute(new SyncPlanCommand(PLAN.id, 'stripe'))).rejects.toBeInstanceOf(
            GatewayNotConfiguredError,
        )
    })

    it('is re-runnable: syncing twice does not create a second product', async () => {
        await prices.save(aPrice('price-eur'))
        await sync().execute(new SyncPlanCommand(PLAN.id, 'stripe'))

        await sync().execute(new SyncPlanCommand(PLAN.id, 'stripe'))

        expect((await plans.findById(PLAN.id))?.stripeProductId).toBe('prod_athlete-pro')
        expect(gateway.calls.filter((call) => call.operation === 'sync')).toHaveLength(2)
    })
})

describe('plan offers', () => {
    let plans: InMemoryPlanRepository
    let offers: InMemoryPlanOfferRepository
    // One id generator for the whole test: a fresh one per call would hand both
    // offers the same id, and the second would quietly overwrite the first.
    let ids: FakeIdGenerator

    beforeEach(() => {
        plans = new InMemoryPlanRepository([PlanMother.athletePro()])
        offers = new InMemoryPlanOfferRepository()
        ids = new FakeIdGenerator()
    })

    const upsert = () => new UpsertPlanOfferHandler(plans, offers, new FakeClock(NOW), ids, silentLogger())

    it('retires the offer the plan had live instead of editing it', async () => {
        // The old terms are already a coupon at the gateway, and coupons are
        // immutable — the people who signed up under them keep them.
        const first = await upsert().execute(new UpsertPlanOfferCommand(PLAN.id, 'Launch', 14, null, NOW, null))

        const second = await upsert().execute(new UpsertPlanOfferCommand(PLAN.id, 'Summer', 30, null, NOW, null))

        expect((await offers.findById(first))?.active).toBe(false)
        expect((await offers.findActiveByPlan(PLAN.id))?.id).toBe(second)
    })

    it('refuses an offer that promises nothing', async () => {
        await expect(
            upsert().execute(new UpsertPlanOfferCommand(PLAN.id, 'Empty', null, null, NOW, null)),
        ).rejects.toBeInstanceOf(InvalidPlanOfferError)
    })

    it('refuses an offer that ends before it starts', async () => {
        const yesterday = new Date('2026-07-14T00:00:00.000Z')

        await expect(
            upsert().execute(new UpsertPlanOfferCommand(PLAN.id, 'Backwards', 7, null, NOW, yesterday)),
        ).rejects.toBeInstanceOf(InvalidPlanOfferError)
    })
})
