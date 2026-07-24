import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    FakeIdGenerator,
    InMemoryPlanPriceRepository,
    InMemoryPlanRepository,
    InMemoryPlanTranslationRepository,
} from '../../../../../tests/doubles/billing'
import { RecordingEventBus, silentLogger } from '../../../../../tests/doubles/shared'
import { PlanMother } from '../../../../../tests/mothers/billing'
import { InvalidPlanEntitlementsError } from '../../domain/errors/billing.errors'
import {
    FreePlanExistsError,
    LastFreePlanError,
    PlanNotFoundError,
    PlanSlugTakenError,
} from '../../domain/errors/billing.errors'
import { AddPlanPriceCommand } from './add-plan-price/add-plan-price.command'
import { AddPlanPriceHandler } from './add-plan-price/add-plan-price.handler'
import { CreatePlanCommand } from './create-plan/create-plan.command'
import { CreatePlanHandler } from './create-plan/create-plan.handler'
import { DeactivatePlanPriceCommand } from './deactivate-plan-price/deactivate-plan-price.command'
import { DeactivatePlanPriceHandler } from './deactivate-plan-price/deactivate-plan-price.handler'
import { SetPlanStatusCommand } from './set-plan-status/set-plan-status.command'
import { SetPlanStatusHandler } from './set-plan-status/set-plan-status.handler'
import { UpdatePlanCommand } from './update-plan/update-plan.command'
import { UpdatePlanHandler } from './update-plan/update-plan.handler'

const NOW = new Date('2026-07-15T00:00:00.000Z')
const ATHLETE_ENTITLEMENTS = { maxTemplates: null, maxMesocycles: null, maxWorkouts: null, ai: true }

describe('catalog admin handlers', () => {
    let plans: InMemoryPlanRepository
    let prices: InMemoryPlanPriceRepository
    let translations: InMemoryPlanTranslationRepository
    let clock: FakeClock
    let ids: FakeIdGenerator

    beforeEach(() => {
        plans = new InMemoryPlanRepository([PlanMother.athleteFree(), PlanMother.coachFree()])
        prices = new InMemoryPlanPriceRepository()
        translations = new InMemoryPlanTranslationRepository()
        clock = new FakeClock(NOW)
        ids = new FakeIdGenerator()
    })

    const bus = () => new RecordingEventBus().asEventBus()
    const createPlan = () => new CreatePlanHandler(plans, translations, clock, ids, silentLogger())
    const updatePlan = () => new UpdatePlanHandler(plans, translations, clock, bus(), silentLogger())
    const setStatus = () => new SetPlanStatusHandler(plans, clock, bus(), silentLogger())
    const addPrice = () => new AddPlanPriceHandler(plans, prices, clock, ids, silentLogger())
    const deactivatePrice = () => new DeactivatePlanPriceHandler(prices, clock, silentLogger())

    const aCreateCommand = (overrides: Partial<{ slug: string; isFree: boolean; status: 'draft' | 'active' }> = {}) =>
        new CreatePlanCommand(
            'athlete',
            overrides.slug ?? 'athlete-plus',
            'Plus',
            null,
            ATHLETE_ENTITLEMENTS,
            overrides.status ?? 'draft',
            overrides.isFree ?? false,
            5,
            false,
            [],
        )

    describe('createPlan', () => {
        it('creates a plan as a draft, so it is not on sale the moment it is saved', async () => {
            const id = await createPlan().execute(aCreateCommand())

            const created = await plans.findById(id)
            expect(created?.slug).toBe('athlete-plus')
            expect(created?.status).toBe('draft')
            expect(created?.acceptsSignups()).toBe(false)
        })

        it('refuses a slug the catalog already uses', async () => {
            await expect(createPlan().execute(aCreateCommand({ slug: 'athlete-free' }))).rejects.toBeInstanceOf(
                PlanSlugTakenError,
            )
        })

        it('refuses a second active free plan for the same audience', async () => {
            const command = aCreateCommand({ slug: 'athlete-free-2', isFree: true, status: 'active' })

            await expect(createPlan().execute(command)).rejects.toBeInstanceOf(FreePlanExistsError)
        })

        it('rejects entitlements that do not match the audience', async () => {
            // A coach-shaped value on an athlete plan: caught by the audience's schema,
            // not by the shape of the GraphQL input (there isn't one — it's jsonb).
            const command = new CreatePlanCommand(
                'athlete',
                'athlete-weird',
                'Weird',
                null,
                { maxAthletes: 3, planSessions: true, athlete: ATHLETE_ENTITLEMENTS },
                'draft',
                false,
                0,
                false,
                [],
            )

            await expect(createPlan().execute(command)).rejects.toBeInstanceOf(InvalidPlanEntitlementsError)
        })
    })

    describe('updatePlan', () => {
        it('changes the entitlements of a live plan — subscribers read them on the next check', async () => {
            const plan = PlanMother.athletePro()
            plans.seed(plan)

            await updatePlan().execute(
                new UpdatePlanCommand(plan.id, {
                    entitlements: { maxTemplates: null, maxMesocycles: null, maxWorkouts: null, ai: false },
                }),
            )

            const updated = await plans.findById(plan.id)
            expect(updated?.entitlements.publicView().ai).toBe(false)
        })

        it('leaves out what the patch does not mention', async () => {
            const plan = PlanMother.athletePro()
            plans.seed(plan)

            await updatePlan().execute(new UpdatePlanCommand(plan.id, { name: 'Pro (renamed)' }))

            const updated = await plans.findById(plan.id)
            expect(updated?.name).toBe('Pro (renamed)')
            expect(updated?.entitlements.publicView().ai).toBe(true)
        })

        it('fails on a plan that is not there', async () => {
            await expect(updatePlan().execute(new UpdatePlanCommand('nope', { name: 'X' }))).rejects.toBeInstanceOf(
                PlanNotFoundError,
            )
        })
    })

    describe('setPlanStatus', () => {
        it('archives a paid plan: it stops taking signups, the subscriptions on it are untouched', async () => {
            const plan = PlanMother.athletePro()
            plans.seed(plan)

            await setStatus().execute(new SetPlanStatusCommand(plan.id, 'archived'))

            expect((await plans.findById(plan.id))?.acceptsSignups()).toBe(false)
        })

        it("refuses to archive an audience's only free plan", async () => {
            // Without it, every user of that audience with no subscription — most of
            // them — could not be told what they may do at all.
            const free = await plans.findActiveFree('athlete')

            await expect(setStatus().execute(new SetPlanStatusCommand(free!.id, 'archived'))).rejects.toBeInstanceOf(
                LastFreePlanError,
            )
            expect((await plans.findActiveFree('athlete'))?.id).toBe(free!.id)
        })

        it('refuses to publish a second free plan for an audience', async () => {
            const spare = PlanMother.athleteFree({ id: 'plan-athlete-free-2', status: 'draft' })
            plans.seed(spare)

            await expect(setStatus().execute(new SetPlanStatusCommand(spare.id, 'active'))).rejects.toBeInstanceOf(
                FreePlanExistsError,
            )
        })
    })

    describe('plan prices', () => {
        it('repricing withdraws the version on sale and puts the new one in its place', async () => {
            const plan = PlanMother.athletePro()
            plans.seed(plan)
            const oldId = await addPrice().execute(new AddPlanPriceCommand(plan.id, 'month', 'EUR', 799))

            const newId = await addPrice().execute(new AddPlanPriceCommand(plan.id, 'month', 'EUR', 999))

            // The old version stays in the table — the subscriptions signed on it keep
            // pointing at it, which is the whole reason prices are versioned.
            expect((await prices.findById(oldId))?.active).toBe(false)
            expect((await prices.findById(oldId))?.amountCents).toBe(799)
            expect((await prices.findActive(plan.id, 'month', 'EUR'))?.id).toBe(newId)
            expect(prices.all()).toHaveLength(2)
        })

        it('leaves the other currency alone when one is repriced', async () => {
            const plan = PlanMother.athletePro()
            plans.seed(plan)
            const usd = await addPrice().execute(new AddPlanPriceCommand(plan.id, 'month', 'USD', 899))

            await addPrice().execute(new AddPlanPriceCommand(plan.id, 'month', 'EUR', 999))

            expect((await prices.findById(usd))?.active).toBe(true)
        })

        it('withdraws a price without replacing it', async () => {
            const plan = PlanMother.athletePro()
            plans.seed(plan)
            const id = await addPrice().execute(new AddPlanPriceCommand(plan.id, 'year', 'EUR', 7990))

            await deactivatePrice().execute(new DeactivatePlanPriceCommand(id))

            expect(await prices.findActive(plan.id, 'year', 'EUR')).toBeNull()
        })

        it('refuses a price for a plan that is not there', async () => {
            await expect(
                addPrice().execute(new AddPlanPriceCommand('nope', 'month', 'EUR', 999)),
            ).rejects.toBeInstanceOf(PlanNotFoundError)
        })
    })
})
