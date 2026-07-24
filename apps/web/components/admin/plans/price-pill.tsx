'use client'

import { useTranslations } from 'next-intl'

import type { AdminPlanPrice } from '@/lib/graphql/hooks/use-admin-billing'
import { formatAmount } from './shared'

/** One active price as a compact pill: amount / interval. */
export function PricePill({ price }: { price: AdminPlanPrice }) {
    const t = useTranslations('admin')

    return (
        <span className="rounded-full bg-white/[0.04] px-3 py-1 font-mono text-xs text-text-dim">
            {formatAmount(price.amountCents, price.currency, 'en')} /{' '}
            {t(`interval.${price.interval}` as 'interval.month')}
        </span>
    )
}
