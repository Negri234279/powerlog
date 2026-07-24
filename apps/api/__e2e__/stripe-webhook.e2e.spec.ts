import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import cookieParser from 'cookie-parser'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import Stripe from 'stripe'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// MUST come before the AppModule import: ConfigModule validates the environment
// while AppModule is being imported, so the keys have to be there by then.
import { STRIPE_TEST_SECRET_KEY, STRIPE_TEST_WEBHOOK_SECRET } from './helpers/stripe-test-env'
import { AppModule } from '../src/app.module'
import { PG_POOL } from '../src/database/database.module'
import * as schema from '../src/database/schema'
import { Mailer } from '../src/mail/mailer.port'
import { FakeMailer } from '../tests/doubles/shared'

/**
 * The webhook endpoint, for real: the payloads are **signed with the test secret
 * and verified by the real StripeGateway**, against real Postgres. Nothing about
 * the security of this endpoint is faked — a wrong signature has to be refused,
 * and a right one has to end up as a subscription that grants the plan.
 *
 * Stripe itself is never called: the events are the ones Stripe would send.
 */

const WEBHOOK_SECRET = STRIPE_TEST_WEBHOOK_SECRET
const STRIPE_KEY = STRIPE_TEST_SECRET_KEY

let container: StartedPostgreSqlContainer
let app: INestApplication
let pool: Pool
let httpServer: ReturnType<INestApplication['getHttpServer']>
let stripe: Stripe

const COOKIE = { access: 'pl_at' }

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    const testPool = new Pool({ connectionString: container.getConnectionUri() })
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(PG_POOL)
        .useValue(testPool)
        .overrideProvider(Mailer)
        .useValue(new FakeMailer())
        .compile()

    app = moduleRef.createNestApplication({ bufferLogs: true, rawBody: true })
    app.use(cookieParser())
    await app.init()

    pool = app.get<Pool>(PG_POOL)
    await migrate(drizzle(pool, { schema }), { migrationsFolder: './drizzle' })
    httpServer = app.getHttpServer()
    stripe = new Stripe(STRIPE_KEY)
}, 180_000)

afterAll(async () => {
    await app?.close()
    await container?.stop()
})

beforeEach(async () => {
    await pool.query(
        'TRUNCATE TABLE users, profiles, subscriptions, invoices, billing_webhook_events RESTART IDENTITY CASCADE',
    )
})

// ── helpers ───────────────────────────────────────────────────────────
function setCookies(res: request.Response): string[] {
    const raw = res.headers['set-cookie']
    return Array.isArray(raw) ? raw : raw ? [raw] : []
}

function cookiePair(cookies: string[], name: string): string | undefined {
    return cookies.find((c) => c.startsWith(`${name}=`))?.split(';')[0]
}

function gql(query: string, cookie?: string) {
    const req = request(httpServer).post('/graphql').send({ query })
    return cookie ? req.set('Cookie', cookie) : req
}

async function register(email: string): Promise<{ access: string; userId: string }> {
    const res = await gql(
        `mutation { register(input: { email: "${email}", username: "${email.split('@')[0]}", password: "supersecret" }) { id } }`,
    )
    expect(res.body.errors).toBeUndefined()

    return { access: cookiePair(setCookies(res), COOKIE.access)!, userId: res.body.data.register.id }
}

async function planIds(slug: string): Promise<{ planId: string; priceId: string }> {
    const { rows } = await pool.query<{ plan_id: string; price_id: string }>(
        `SELECT p.id AS plan_id, pp.id AS price_id
         FROM plans p JOIN plan_prices pp ON pp.plan_id = p.id
         WHERE p.slug = $1 AND pp.interval = 'month' AND pp.currency = 'EUR' AND pp.active`,
        [slug],
    )

    return { planId: rows[0]!.plan_id, priceId: rows[0]!.price_id }
}

/** Post an event the way Stripe would: signed with the webhook secret, raw body. */
function deliver(event: object) {
    const payload = JSON.stringify(event)
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET })

    return request(httpServer)
        .post('/webhooks/stripe')
        .set('stripe-signature', signature)
        .set('content-type', 'application/json')
        .send(payload)
}

const checkoutCompleted = (input: { userId: string; planId: string; priceId: string; subscriptionId: string }) => ({
    id: `evt_${input.subscriptionId}_checkout`,
    object: 'event',
    type: 'checkout.session.completed',
    data: {
        object: {
            id: 'cs_test_1',
            object: 'checkout.session',
            client_reference_id: input.userId,
            customer: 'cus_test_1',
            subscription: input.subscriptionId,
            metadata: { userId: input.userId, planId: input.planId, priceId: input.priceId },
        },
    },
})

/**
 * What Stripe actually sends first for a checkout that pays on the spot: the
 * subscription is born `active`, a second before `checkout.session.completed`, and
 * **no `customer.subscription.updated` ever follows**. The `userId` rides on
 * `subscription_data.metadata`, which is what lets this event open the row alone.
 */
const subscriptionCreated = (input: {
    userId: string
    planId: string
    priceId: string
    subscriptionId: string
    periodEnd: number
}) => ({
    id: `evt_${input.subscriptionId}_created`,
    object: 'event',
    type: 'customer.subscription.created',
    data: {
        object: {
            id: input.subscriptionId,
            object: 'subscription',
            status: 'active',
            cancel_at_period_end: false,
            canceled_at: null,
            customer: 'cus_test_1',
            metadata: { userId: input.userId, planId: input.planId, priceId: input.priceId },
            items: {
                object: 'list',
                data: [
                    {
                        id: 'si_test_1',
                        object: 'subscription_item',
                        current_period_start: Math.floor(Date.now() / 1000),
                        current_period_end: input.periodEnd,
                        price: { id: 'px_test_1', object: 'price' },
                    },
                ],
            },
        },
    },
})

/** `current_period_*` live on the ITEM in this API version — that is the point. */
const subscriptionUpdated = (input: {
    subscriptionId: string
    status: string
    periodEnd: number
    cancelAtPeriodEnd?: boolean
    eventId?: string
}) => ({
    id: input.eventId ?? `evt_${input.subscriptionId}_${input.status}`,
    object: 'event',
    type: 'customer.subscription.updated',
    data: {
        object: {
            id: input.subscriptionId,
            object: 'subscription',
            status: input.status,
            cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
            canceled_at: null,
            customer: 'cus_test_1',
            items: {
                object: 'list',
                data: [
                    {
                        id: 'si_test_1',
                        object: 'subscription_item',
                        current_period_start: Math.floor(Date.now() / 1000),
                        current_period_end: input.periodEnd,
                        price: { id: 'px_test_1', object: 'price' },
                    },
                ],
            },
        },
    },
})

const inThirtyDays = () => Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60

describe('the Stripe webhook', () => {
    it('refuses a payload that is not signed', async () => {
        const res = await request(httpServer)
            .post('/webhooks/stripe')
            .set('content-type', 'application/json')
            .send(JSON.stringify({ id: 'evt_forged', type: 'checkout.session.completed' }))

        // An unsigned payload is somebody claiming a payment happened.
        expect(res.status).toBe(401)
    })

    it('refuses a payload signed with the wrong secret', async () => {
        const payload = JSON.stringify({ id: 'evt_forged', type: 'checkout.session.completed' })
        const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_the_wrong_one' })

        const res = await request(httpServer)
            .post('/webhooks/stripe')
            .set('stripe-signature', signature)
            .set('content-type', 'application/json')
            .send(payload)

        expect(res.status).toBe(401)
    })

    it('turns a paid checkout into a subscription that actually unlocks the feature', async () => {
        const user = await register('buyer@example.com')
        const { planId, priceId } = await planIds('athlete-pro')

        // Free: no AI.
        const before = await gql(
            `mutation { generateMesocycleDraft(input: { weeks: 4, trainingDays: [0, 3] }) { id } }`,
            user.access,
        )
        expect(before.body.errors[0].extensions.code).toBe('FEATURE_NOT_IN_PLAN')

        await deliver(checkoutCompleted({ userId: user.userId, planId, priceId, subscriptionId: 'sub_test_1' })).expect(
            200,
        )
        await deliver(
            subscriptionUpdated({ subscriptionId: 'sub_test_1', status: 'active', periodEnd: inThirtyDays() }),
        ).expect(200)

        const after = await gql(
            `mutation { generateMesocycleDraft(input: { weeks: 4, trainingDays: [0, 3] }) { id } }`,
            user.access,
        )
        // Past the plan gate; it stops at the missing provider key instead.
        expect(after.body.errors[0].extensions.code).not.toBe('FEATURE_NOT_IN_PLAN')

        const mine = await gql(
            `query { mySubscription(audience: "athlete") { planSlug status gateway cancelAtPeriodEnd } }`,
            user.access,
        )
        expect(mine.body.data.mySubscription).toMatchObject({
            planSlug: 'athlete-pro',
            status: 'active',
            gateway: 'stripe',
            cancelAtPeriodEnd: false,
        })

        // The athlete plan does not leak into the coach audience: subscriptions are
        // resolved per audience, so the coach side is empty (they do no coaching).
        const coachSide = await gql(`query { mySubscription(audience: "coach") { planSlug } }`, user.access)
        expect(coachSide.body.data.mySubscription).toBeNull()
    })

    it('activates a checkout that pays immediately, where Stripe only sends `created`', async () => {
        // The bug this fixes: acting only on `customer.subscription.updated` left a
        // paid user `incomplete` forever, because for an immediate payment Stripe
        // never sends one — it sends `created`, already active, before the checkout.
        const user = await register('instant@example.com')
        const { planId, priceId } = await planIds('athlete-pro')
        // Published to Stripe, exactly as `syncPlanToGateway` leaves it — a checkout
        // for an unsynced price is refused, so a real subscription always has this.
        await pool.query('UPDATE plan_prices SET stripe_price_id = $1 WHERE id = $2', ['px_test_1', priceId])

        await deliver(
            subscriptionCreated({
                userId: user.userId,
                planId,
                priceId,
                subscriptionId: 'sub_test_instant',
                periodEnd: inThirtyDays(),
            }),
        ).expect(200)
        await deliver(
            checkoutCompleted({ userId: user.userId, planId, priceId, subscriptionId: 'sub_test_instant' }),
        ).expect(200)

        const mine = await gql(`query { mySubscription(audience: "athlete") { planSlug status } }`, user.access)
        expect(mine.body.data.mySubscription).toMatchObject({ planSlug: 'athlete-pro', status: 'active' })

        // The plan is not a label: it has to actually unlock the thing they paid for.
        const after = await gql(
            `mutation { generateMesocycleDraft(input: { weeks: 4, trainingDays: [0, 3] }) { id } }`,
            user.access,
        )
        expect(after.body.errors[0].extensions.code).not.toBe('FEATURE_NOT_IN_PLAN')

        // One row, and the customer the portal is opened against survived the race.
        const { rows } = await pool.query('SELECT gateway_customer_id FROM subscriptions WHERE user_id = $1', [
            user.userId,
        ])
        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({ gateway_customer_id: 'cus_test_1' })
    })

    it('is idempotent: the same event twice leaves one subscription', async () => {
        const user = await register('retried@example.com')
        const { planId, priceId } = await planIds('athlete-pro')
        const event = checkoutCompleted({ userId: user.userId, planId, priceId, subscriptionId: 'sub_test_2' })

        await deliver(event).expect(200)
        await deliver(event).expect(200)

        const { rows } = await pool.query('SELECT id FROM subscriptions WHERE user_id = $1', [user.userId])
        expect(rows).toHaveLength(1)

        // And the journal recorded the event exactly once.
        const events = await pool.query('SELECT status FROM billing_webhook_events')
        expect(events.rows).toHaveLength(1)
        expect(events.rows[0]).toMatchObject({ status: 'processed' })
    })

    it('a cancellation made in Stripe keeps the time the user already paid for', async () => {
        const user = await register('leaving@example.com')
        const { planId, priceId } = await planIds('athlete-pro')
        await deliver(checkoutCompleted({ userId: user.userId, planId, priceId, subscriptionId: 'sub_test_3' }))
        await deliver(
            subscriptionUpdated({ subscriptionId: 'sub_test_3', status: 'active', periodEnd: inThirtyDays() }),
        )

        await deliver(
            subscriptionUpdated({
                subscriptionId: 'sub_test_3',
                status: 'canceled',
                periodEnd: inThirtyDays(),
                cancelAtPeriodEnd: true,
                eventId: 'evt_cancelled_in_stripe',
            }),
        ).expect(200)

        // Cancelled, but the month is not over: the plan is still theirs.
        const mine = await gql(
            `query { mySubscription(audience: "athlete") { status cancelAtPeriodEnd } }`,
            user.access,
        )
        expect(mine.body.data.mySubscription).toMatchObject({ status: 'canceled', cancelAtPeriodEnd: true })

        const entitlements = await gql(`query { myEntitlements { athlete { plan ai } } }`, user.access)
        expect(entitlements.body.data.myEntitlements.athlete).toMatchObject({ plan: 'athlete-pro', ai: true })
    })

    it('mirrors the invoice Stripe issued, with its number and its PDF', async () => {
        const user = await register('invoiced@example.com')
        const { planId, priceId } = await planIds('athlete-pro')
        await deliver(checkoutCompleted({ userId: user.userId, planId, priceId, subscriptionId: 'sub_test_4' }))

        await deliver({
            id: 'evt_invoice_paid',
            object: 'event',
            type: 'invoice.paid',
            data: {
                object: {
                    id: 'in_test_1',
                    object: 'invoice',
                    number: 'PL-0001',
                    status: 'paid',
                    amount_due: 799,
                    amount_paid: 799,
                    currency: 'eur',
                    created: Math.floor(Date.now() / 1000),
                    customer: 'cus_test_1',
                    hosted_invoice_url: 'https://invoice.stripe.test/in_test_1',
                    invoice_pdf: 'https://invoice.stripe.test/in_test_1.pdf',
                    // The subscription hangs off `parent` in this API version.
                    parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_test_4' } },
                },
            },
        }).expect(200)

        const invoices = await gql(
            `query { myInvoices { total rows { number status amountPaidCents pdfUrl } } }`,
            user.access,
        )
        expect(invoices.body.data.myInvoices.total).toBe(1)
        expect(invoices.body.data.myInvoices.rows[0]).toMatchObject({
            number: 'PL-0001',
            status: 'paid',
            amountPaidCents: 799,
            pdfUrl: 'https://invoice.stripe.test/in_test_1.pdf',
        })
    })

    it('records an event it does not act on, instead of dropping it', async () => {
        await deliver({
            id: 'evt_unhandled',
            object: 'event',
            type: 'customer.created',
            data: { object: { id: 'cus_x', object: 'customer' } },
        }).expect(200)

        const { rows } = await pool.query('SELECT type, status FROM billing_webhook_events')
        expect(rows[0]).toMatchObject({ type: 'customer.created', status: 'processed' })
    })
})
