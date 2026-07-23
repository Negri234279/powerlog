'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import { type SupportTicketRow, useAdminSupportTickets } from '@/lib/graphql/hooks/use-admin-support'
import { formatNumericDate } from '@/lib/format-date'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { AdminTabs } from '@/components/admin/admin-tabs'
import { StatusPill } from '@/components/admin/support-status-pill'
import { ClearableSearch } from '@/components/ui/clearable-search'
import { Select } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { TrackedLink } from '@/components/ui/tracked'

const STATUSES = ['open', 'closed'] as const
const CATEGORIES = ['general', 'billing', 'bug', 'account', 'feature', 'other'] as const

export default function AdminContactPage() {
    const t = useTranslations('admin.support')
    const ta = useTranslations('admin')
    const [status, setStatus] = useState('')
    const [category, setCategory] = useState('')
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebouncedValue(search, 300)

    const { data, isLoading } = useAdminSupportTickets({
        status: status || undefined,
        category: category || undefined,
        search: debouncedSearch || undefined,
    })

    return (
        <div>
            <TextsReveal>
                <p className="font-mono text-eyebrow uppercase text-text-faint">{ta('eyebrow')}</p>
                <h1 className="mt-1 font-display text-h2 tracking-tight">{t('title')}</h1>
            </TextsReveal>

            <div className="mt-8">
                <AdminTabs />
            </div>

            {/* Desktop: one row — search grows, each select shrinks to its content.
                Mobile: search takes the full first row, the two selects split the
                second row half-and-half. */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                <div className="w-full sm:flex-1">
                    <ClearableSearch
                        analyticsId="admin-support-search"
                        value={search}
                        onChange={setSearch}
                        placeholder={t('searchPlaceholder')}
                    />
                </div>
                <Select
                    aria-label={t('statusLabel')}
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="w-auto! flex-1 py-2.5 sm:flex-none"
                >
                    <option value="">{t('anyStatus')}</option>
                    {STATUSES.map((value) => (
                        <option key={value} value={value}>
                            {t(`status.${value}`)}
                        </option>
                    ))}
                </Select>
                <Select
                    aria-label={t('categoryLabel')}
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="w-auto! flex-1 py-2.5 sm:flex-none"
                >
                    <option value="">{t('anyCategory')}</option>
                    {CATEGORIES.map((value) => (
                        <option key={value} value={value}>
                            {t(`categories.${value}`)}
                        </option>
                    ))}
                </Select>
            </div>

            <div className="mt-6 space-y-2">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-2xl" />)
                ) : data?.rows.length ? (
                    data.rows.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} />)
                ) : (
                    <p className="text-sm text-text-faint">{t('empty')}</p>
                )}
            </div>

            {data ? (
                <p className="mt-4 font-mono text-xs text-text-faint">{t('total', { total: data.total })}</p>
            ) : null}
        </div>
    )
}

function TicketRow({ ticket }: { ticket: SupportTicketRow }) {
    const t = useTranslations('admin.support')
    const locale = useLocale()

    return (
        <TrackedLink
            analyticsId="admin-support-open"
            href={`/admin/contact/${ticket.id}`}
            className="block rounded-2xl bg-surface p-4 ring-1 ring-hairline transition-colors duration-300 hover:ring-ember/30"
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <StatusPill status={ticket.status} />
                        <p className="truncate text-sm text-text">{ticket.subject}</p>
                    </div>
                    <p className="mt-1 font-mono text-xs text-text-faint">
                        {t(`categories.${ticket.category}` as 'categories.general')}
                        <span className="mx-1.5">·</span>
                        {ticket.requesterUsername ? `@${ticket.requesterUsername}` : ticket.requesterEmail}
                        <span className="mx-1.5">·</span>
                        {t('messages', { count: ticket.messageCount })}
                    </p>
                </div>
                <span className="shrink-0 font-mono text-xs text-text-faint">
                    {formatNumericDate(ticket.lastMessageAt, locale)}
                </span>
            </div>
        </TrackedLink>
    )
}
