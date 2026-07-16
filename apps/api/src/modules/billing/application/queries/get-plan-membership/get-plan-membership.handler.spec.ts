import { describe, expect, it } from 'vitest'

import { FakeClock, InMemoryPlanRepository } from '../../../../../../tests/doubles/billing'
import { PlanMother } from '../../../../../../tests/mothers/billing'
import { GetPlanMembershipQuery } from '../../../../../shared/contracts/get-plan-membership.query'
import { type EntitledSubscriberRow, PlanMembershipReadModel } from '../../ports/plan-membership.read-model'
import { GetPlanMembershipHandler } from './get-plan-membership.handler'

/** The entitled set as the SQL read model would return it — who, on which plan. */
class StubPlanMembershipReadModel extends PlanMembershipReadModel {
    constructor(private readonly rows: EntitledSubscriberRow[] = []) {
        super()
    }

    entitledSubscribers(): Promise<EntitledSubscriberRow[]> {
        return Promise.resolve(this.rows)
    }
}

describe('GetPlanMembershipHandler', () => {
    const plans = () =>
        new InMemoryPlanRepository([
            PlanMother.athleteFree(),
            PlanMother.athletePro(),
            PlanMother.coachFree(),
            PlanMother.coachPro(),
        ])

    it('matches the subscribers of a picked paid plan', async () => {
        const readModel = new StubPlanMembershipReadModel([
            { userId: 'u1', planSlug: 'athlete-pro' },
            { userId: 'u2', planSlug: 'coach-pro' },
        ])
        const handler = new GetPlanMembershipHandler(readModel, plans(), new FakeClock())

        const membership = await handler.execute(new GetPlanMembershipQuery(['athlete-pro']))

        expect(membership.subscriberIds).toEqual(['u1'])
        // No free plan picked, so nobody matches by fallback…
        expect(membership.freeAudiences).toEqual([])
        // …but every subscriber is still reported, because whoever picks a free plan
        // next needs them excluded from it.
        expect(membership.entitledUserIds).toEqual(['u1', 'u2'])
    })

    it('turns a picked free plan into its audience, not into a list of subscribers', async () => {
        const readModel = new StubPlanMembershipReadModel([{ userId: 'u1', planSlug: 'athlete-pro' }])
        const handler = new GetPlanMembershipHandler(readModel, plans(), new FakeClock())

        const membership = await handler.execute(new GetPlanMembershipQuery(['athlete-free']))

        // A free plan has no subscription rows: it's "every athlete who isn't paying",
        // which is the audience minus the entitled.
        expect(membership.subscriberIds).toEqual([])
        expect(membership.freeAudiences).toEqual(['athlete'])
        expect(membership.entitledUserIds).toEqual(['u1'])
    })

    it('does not fall back to an archived free plan', async () => {
        const catalog = new InMemoryPlanRepository([PlanMother.athleteFree({ status: 'archived' })])
        const handler = new GetPlanMembershipHandler(new StubPlanMembershipReadModel(), catalog, new FakeClock())

        const membership = await handler.execute(new GetPlanMembershipQuery(['athlete-free']))

        // `GetUserEntitlementsHandler` only ever reaches for the ACTIVE free plan, so
        // an archived one entitles nobody and must not sweep up its audience here.
        expect(membership).toEqual({ subscriberIds: [], freeAudiences: [], entitledUserIds: [] })
    })

    it('matches nobody for a slug that is not in the catalog', async () => {
        const handler = new GetPlanMembershipHandler(new StubPlanMembershipReadModel(), plans(), new FakeClock())

        const membership = await handler.execute(new GetPlanMembershipQuery(['plan-that-was-deleted']))

        // The catalog can move under a bookmarked filter; that's an empty result,
        // not an error.
        expect(membership).toEqual({ subscriberIds: [], freeAudiences: [], entitledUserIds: [] })
    })

    it('matches paid and free plans picked together', async () => {
        const readModel = new StubPlanMembershipReadModel([
            { userId: 'u1', planSlug: 'athlete-pro' },
            { userId: 'u2', planSlug: 'coach-pro' },
        ])
        const handler = new GetPlanMembershipHandler(readModel, plans(), new FakeClock())

        const membership = await handler.execute(new GetPlanMembershipQuery(['athlete-pro', 'coach-free']))

        expect(membership.subscriberIds).toEqual(['u1'])
        expect(membership.freeAudiences).toEqual(['coach'])
        expect(membership.entitledUserIds).toEqual(['u1', 'u2'])
    })
})
