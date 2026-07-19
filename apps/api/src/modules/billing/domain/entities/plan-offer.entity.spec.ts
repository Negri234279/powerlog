import { describe, expect, it } from 'vitest'

import { InvalidPlanOfferError } from '../errors/billing.errors'
import { PlanOfferEntity } from './plan-offer.entity'

const STARTS = new Date('2026-07-01T00:00:00.000Z')
const ENDS = new Date('2026-08-01T00:00:00.000Z')
const INSIDE = new Date('2026-07-15T00:00:00.000Z')
const AFTER = new Date('2026-08-02T00:00:00.000Z')
const BEFORE = new Date('2026-06-01T00:00:00.000Z')

function anOffer(overrides: Partial<{ endsAt: Date | null; trialDays: number | null }> = {}): PlanOfferEntity {
    return PlanOfferEntity.create({
        id: 'offer-1',
        planId: 'plan-1',
        name: 'Launch',
        trialDays: overrides.trialDays === undefined ? 14 : overrides.trialDays,
        introPhase: { cycles: 3, percentOff: 50 },
        startsAt: STARTS,
        endsAt: overrides.endsAt === undefined ? ENDS : overrides.endsAt,
        now: STARTS,
    })
}

describe('PlanOfferEntity', () => {
    it('is redeemable inside its window', () => {
        expect(anOffer().isRedeemableAt(INSIDE)).toBe(true)
    })

    it('is not redeemable before it starts', () => {
        expect(anOffer().isRedeemableAt(BEFORE)).toBe(false)
    })

    it('is not redeemable once it is over', () => {
        expect(anOffer().isRedeemableAt(AFTER)).toBe(false)
    })

    it('runs forever with no end date', () => {
        expect(anOffer({ endsAt: null }).isRedeemableAt(AFTER)).toBe(true)
    })

    it('stops being redeemable once retired', () => {
        const offer = anOffer()
        offer.deactivate(INSIDE)

        expect(offer.isRedeemableAt(INSIDE)).toBe(false)
    })

    it('rejects a discount outside 1–100%', () => {
        expect(() =>
            PlanOfferEntity.create({
                id: 'offer-2',
                planId: 'plan-1',
                name: 'Impossible',
                introPhase: { cycles: 3, percentOff: 150 },
                startsAt: STARTS,
                now: STARTS,
            }),
        ).toThrow(InvalidPlanOfferError)
    })

    it('rejects a trial longer than a year', () => {
        expect(() =>
            PlanOfferEntity.create({
                id: 'offer-3',
                planId: 'plan-1',
                name: 'Forever',
                trialDays: 400,
                startsAt: STARTS,
                now: STARTS,
            }),
        ).toThrow(InvalidPlanOfferError)
    })

    it('keeps the buyer-facing message it was given', () => {
        const offer = PlanOfferEntity.create({
            id: 'offer-4',
            planId: 'plan-1',
            name: 'Launch',
            message: '7 días gratis',
            trialDays: 7,
            startsAt: STARTS,
            now: STARTS,
        })

        expect(offer.message).toBe('7 días gratis')
    })

    it('trims a blank message down to null so no empty promo line renders', () => {
        expect(anOffer().message).toBeNull()

        const blank = PlanOfferEntity.create({
            id: 'offer-5',
            planId: 'plan-1',
            name: 'Launch',
            message: '   ',
            trialDays: 7,
            startsAt: STARTS,
            now: STARTS,
        })

        expect(blank.message).toBeNull()
    })

    it('rejects a message longer than 120 characters', () => {
        expect(() =>
            PlanOfferEntity.create({
                id: 'offer-6',
                planId: 'plan-1',
                name: 'Wordy',
                message: 'x'.repeat(121),
                trialDays: 7,
                startsAt: STARTS,
                now: STARTS,
            }),
        ).toThrow(InvalidPlanOfferError)
    })
})
