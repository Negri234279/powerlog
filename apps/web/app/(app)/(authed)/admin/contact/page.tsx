'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { type SupportTicketRow, useAdminSupportTickets } from '@/lib/graphql/hooks/use-admin-support'
import { formatNumericDateTime } from '@/lib/format-date'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { AdminTabs } from '@/components/admin/admin-tabs'
import { StatusPill } from '@/components/admin/support-status-pill'
import { ClearableSearch } from '@/components/ui/clearable-search'
import { MultiSelect } from '@/components/ui/multi-select'
import { Skeleton } from '@/components/ui/skeleton'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { TrackedLink } from '@/components/ui/tracked'

const STATUSES = ['open', 'closed'] as const
const CATEGORIES = ['general', 'billing', 'bug', 'account', 'feature', 'other'] as const

/** All filter state in one object — status defaults to `open` so the inbox opens
 *  on the tickets that still need attention. */
interface Filters {
    statuses: string[]
    categories: string[]
    search: string
}

const INITIAL_FILTERS: Filters = { statuses: ['open'], categories: [], search: '' }

export default function AdminContactPage() {
    const t = useTranslations('admin.support')
    const ta = useTranslations('admin')
    const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS)
    const debouncedSearch = useDebouncedValue(filters.search, 300)

    const patch = (next: Partial<Filters>) => setFilters((current) => ({ ...current, ...next }))

    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAdminSupportTickets({
        statuses: filters.statuses,
        categories: filters.categories,
        search: debouncedSearch || undefined,
    })

    const rows = data?.pages.flatMap((page) => page.rows) ?? []
    const total = data?.pages[0]?.total ?? 0

    // Infinite scroll: load the next page when the sentinel scrolls into view.
    const sentinelRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const el = sentinelRef.current
        if (!el || !hasNextPage) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage()
            },
            { rootMargin: '400px' },
        )
        observer.observe(el)

        return () => observer.disconnect()
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    return (
        <div>
            <TextsReveal>
                <p className="font-mono text-eyebrow uppercase text-text-faint">{ta('eyebrow')}</p>
                <h1 className="mt-1 font-display text-h2 tracking-tight">{t('title')}</h1>
            </TextsReveal>

            <div className="mt-8">
                <AdminTabs />
            </div>

            {/* Desktop: one row — search grows, the two multi-selects sit at their
                natural width. Mobile: search takes the full first row, the filters
                wrap onto the second. */}
            <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                <div className="w-full sm:flex-1">
                    <ClearableSearch
                        analyticsId="admin-support-search"
                        value={filters.search}
                        onChange={(search) => patch({ search })}
                        placeholder={t('searchPlaceholder')}
                    />
                </div>
                <MultiSelect
                    analyticsId="admin-support-status"
                    label={t('statusLabel')}
                    ariaLabel={t('statusLabel')}
                    options={STATUSES.map((value) => ({ value, label: t(`status.${value}`) }))}
                    selected={filters.statuses}
                    onChange={(statuses) => patch({ statuses })}
                />
                <MultiSelect
                    analyticsId="admin-support-category"
                    label={t('categoryLabel')}
                    ariaLabel={t('categoryLabel')}
                    options={CATEGORIES.map((value) => ({ value, label: t(`categories.${value}`) }))}
                    selected={filters.categories}
                    onChange={(categories) => patch({ categories })}
                />
            </div>

            <div className="mt-6 space-y-2">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-2xl" />)
                ) : rows.length ? (
                    rows.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} />)
                ) : (
                    <p className="text-sm text-text-faint">{t('empty')}</p>
                )}

                {isFetchingNextPage
                    ? Array.from({ length: 2 }).map((_, index) => (
                          <Skeleton key={`more-${index}`} className="h-20 rounded-2xl" />
                      ))
                    : null}
            </div>

            {/* The observer fires ~400px early so the next page is usually in before
                the user reaches the end. */}
            <div ref={sentinelRef} aria-hidden />

            {!isLoading && total > 0 ? (
                <p className="mt-4 font-mono text-xs text-text-faint">{t('total', { total })}</p>
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
                    {formatNumericDateTime(ticket.lastMessageAt, locale)}
                </span>
            </div>
        </TrackedLink>
    )
}
