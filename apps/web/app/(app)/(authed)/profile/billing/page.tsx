'use client'

import { useTranslations } from 'next-intl'

import { type MyInvoice, useMyInvoices } from '@/lib/graphql/hooks/use-billing'
import { ArrowUpRight } from '@/components/ui/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackedLink } from '@/components/ui/tracked'

function formatAmount(amountCents: number, currency: string): string {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amountCents / 100)
}

/**
 * Billing history. Every row here is a **mirror of what the gateway issued** — we
 * do no invoicing of our own — so the links go to the real document on their side.
 */
export default function BillingPage() {
    const t = useTranslations('billing')
    const { data, isLoading } = useMyInvoices()

    // The payment method is managed per plan now, from /profile/plan (a user can hold
    // two subscriptions on two gateways). This page is the billing history only.
    return (
        <div className="space-y-8">
            <section>
                <h2 className="font-display text-h4 tracking-tight">{t('invoices')}</h2>

                <div className="mt-4 space-y-2">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                            <Skeleton key={index} className="h-16 rounded-2xl" />
                        ))
                    ) : data?.rows.length ? (
                        data.rows.map((invoice) => <InvoiceRow key={invoice.id} invoice={invoice} />)
                    ) : (
                        <p className="text-sm text-text-faint">{t('noInvoices')}</p>
                    )}
                </div>
            </section>
        </div>
    )
}

function InvoiceRow({ invoice }: { invoice: MyInvoice }) {
    const t = useTranslations('billing')
    // The gateway's own PDF is preferred, then its hosted page; for gateways that
    // issue neither (PayPal), our own generated receipt.
    const link = invoice.pdfUrl ?? invoice.hostedUrl ?? invoice.receiptUrl

    return (
        <article className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface p-4 ring-1 ring-hairline">
            <div>
                <p className="text-sm text-text">
                    {invoice.number ?? t('invoiceNoNumber')}
                    <span className="mx-2 text-hairline">·</span>
                    <span className="text-text-dim">{new Date(invoice.issuedAt).toLocaleDateString()}</span>
                </p>
                <p className="mt-0.5 font-mono text-xs text-text-faint">
                    {t(`invoiceStatus.${invoice.status}` as 'invoiceStatus.paid')}
                </p>
            </div>

            <div className="flex items-center gap-4">
                <span className="font-mono text-sm tabular-nums text-text">
                    {formatAmount(
                        invoice.status === 'paid' ? invoice.amountPaidCents : invoice.amountDueCents,
                        invoice.currency,
                    )}
                </span>
                {link ? (
                    <TrackedLink
                        analyticsId="billing-invoice-open"
                        href={link}
                        className="inline-flex items-center gap-1 text-xs text-text-dim transition-colors duration-300 hover:text-text"
                    >
                        {t('viewInvoice')}
                        <ArrowUpRight className="size-3.5" />
                    </TrackedLink>
                ) : null}
            </div>
        </article>
    )
}
