import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeReceiptRenderer,
    InMemoryInvoiceRepository,
    InMemoryPlanRepository,
    InMemorySubscriptionRepository,
} from '../../../../../../tests/doubles/billing'
import { FakeUserDirectory } from '../../../../../../tests/doubles/shared'
import { PlanMother, SubscriptionMother } from '../../../../../../tests/mothers/billing'
import { InvoiceEntity, type InvoiceProps } from '../../../domain/entities/invoice.entity'
import { GetInvoiceReceiptHandler } from './get-invoice-receipt.handler'
import { GetInvoiceReceiptQuery } from './get-invoice-receipt.query'

const NOW = new Date('2026-07-15T00:00:00.000Z')
const USER = 'user-1'
const PRO = PlanMother.athletePro()

function anInvoice(overrides: Partial<InvoiceProps> = {}): InvoiceEntity {
    return InvoiceEntity.create({
        id: 'inv-1',
        userId: USER,
        subscriptionId: 'sub-1',
        gateway: 'paypal',
        gatewayInvoiceId: 'PAY-1',
        number: null,
        status: 'paid',
        amountDueCents: 799,
        amountPaidCents: 799,
        currency: 'EUR',
        hostedUrl: null,
        pdfUrl: null,
        issuedAt: NOW,
        paidAt: NOW,
        ...overrides,
    })
}

/** The receipt we generate for gateways that issue no PDF of their own. */
describe('the invoice receipt', () => {
    let invoices: InMemoryInvoiceRepository
    let subscriptions: InMemorySubscriptionRepository
    let plans: InMemoryPlanRepository
    let users: FakeUserDirectory
    let renderer: FakeReceiptRenderer

    beforeEach(async () => {
        invoices = new InMemoryInvoiceRepository()
        subscriptions = new InMemorySubscriptionRepository()
        plans = new InMemoryPlanRepository([PRO])
        users = new FakeUserDirectory().seed(USER, {
            email: 'buyer@example.com',
            username: 'buyer',
            firstName: 'Alex',
            lastName: 'Rivera',
        })
        renderer = new FakeReceiptRenderer()

        await subscriptions.save(SubscriptionMother.create({ id: 'sub-1', userId: USER, planId: PRO.id }))
    })

    const handler = () => new GetInvoiceReceiptHandler(invoices, subscriptions, plans, users, renderer)

    it('renders the caller’s invoice as a receipt, with the plan and a generated number', async () => {
        await invoices.upsert(anInvoice())

        const receipt = await handler().execute(new GetInvoiceReceiptQuery(USER, 'inv-1'))

        expect(receipt).not.toBeNull()
        // PayPal issues no number, so we mint a stable one from the invoice id.
        expect(receipt?.filename).toMatch(/^powerlog-receipt-PL-2026-/)

        const [rendered] = renderer.rendered
        expect(rendered?.description).toBe(`${PRO.name} plan`)
        expect(rendered?.billedTo).toEqual({ name: 'Alex Rivera', email: 'buyer@example.com' })
        expect(rendered?.amountCents).toBe(799)
        expect(rendered?.currency).toBe('EUR')
        expect(rendered?.paidVia).toBe('PayPal')
    })

    it('keeps the gateway’s own number when it issued one (Stripe)', async () => {
        await invoices.upsert(anInvoice({ gateway: 'stripe', gatewayInvoiceId: 'in_1', number: 'A-0001' }))

        const receipt = await handler().execute(new GetInvoiceReceiptQuery(USER, 'inv-1'))

        expect(receipt?.filename).toBe('powerlog-receipt-A-0001.pdf')
        expect(renderer.rendered[0]?.number).toBe('A-0001')
    })

    it('returns null for an invoice that belongs to someone else', async () => {
        await invoices.upsert(anInvoice())

        const receipt = await handler().execute(new GetInvoiceReceiptQuery('someone-else', 'inv-1'))

        // Null, not a different error: a guessed id cannot tell "not yours" from "not there".
        expect(receipt).toBeNull()
        expect(renderer.rendered).toEqual([])
    })

    it('returns null when the invoice does not exist', async () => {
        const receipt = await handler().execute(new GetInvoiceReceiptQuery(USER, 'nope'))

        expect(receipt).toBeNull()
    })
})
