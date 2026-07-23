'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useState } from 'react'

import { type SupportMessage, useAdminSupportTicket, useSetTicketStatus } from '@/lib/graphql/hooks/use-admin-support'
import { formatNumericDate } from '@/lib/format-date'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { StatusPill } from '@/components/admin/support-status-pill'
import { ChevronLeft } from '@/components/ui/icons'
import { FormError } from '@/components/ui/form-error'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

export default function AdminContactDetailPage() {
    const t = useTranslations('admin.support')
    const locale = useLocale()
    const errorMessage = useErrorMessage()
    const params = useParams<{ id: string }>()
    const id = params.id

    const { data: ticket, isLoading } = useAdminSupportTicket(id)
    const setStatus = useSetTicketStatus()
    const [error, setError] = useState<string | null>(null)

    function toggleStatus() {
        if (!ticket) return
        setError(null)
        const next = ticket.status === 'open' ? 'closed' : 'open'
        setStatus.mutate({ id, status: next }, { onError: (err) => setError(errorMessage(err)) })
    }

    return (
        <div>
            <TrackedLink
                analyticsId="admin-support-back"
                href="/admin/contact"
                className="inline-flex items-center gap-1.5 text-sm text-text-dim transition-colors duration-300 hover:text-text"
            >
                <ChevronLeft className="size-4" />
                {t('back')}
            </TrackedLink>

            {isLoading ? (
                <div className="mt-6 space-y-3">
                    <Skeleton className="h-24 rounded-2xl" />
                    <Skeleton className="h-32 rounded-2xl" />
                </div>
            ) : !ticket ? (
                <p className="mt-6 text-sm text-text-faint">{t('notFound')}</p>
            ) : (
                <div className="mt-6 space-y-6">
                    <header className="rounded-2xl bg-surface p-6 ring-1 ring-hairline">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <StatusPill status={ticket.status} />
                                    <span className="font-mono text-eyebrow uppercase text-text-faint">
                                        {t(`categories.${ticket.category}` as 'categories.general')}
                                    </span>
                                </div>
                                <h1 className="mt-2 font-display text-h3 tracking-tight text-text">{ticket.subject}</h1>
                                <p className="mt-2 text-sm text-text-dim">
                                    {ticket.requesterName ? `${ticket.requesterName} · ` : ''}
                                    {ticket.requesterEmail}
                                    {ticket.requesterUserId ? (
                                        <>
                                            {' · '}
                                            <TrackedLink
                                                analyticsId="admin-support-user-link"
                                                href={`/admin/users/${ticket.requesterUserId}`}
                                                className="text-ember transition-colors hover:text-ember-soft"
                                            >
                                                @{ticket.requesterUsername ?? t('linkedUser')}
                                            </TrackedLink>
                                        </>
                                    ) : (
                                        <span className="text-text-faint"> · {t('noAccount')}</span>
                                    )}
                                </p>
                                <p className="mt-1 font-mono text-xs text-text-faint">
                                    {t('openedOn', { date: formatNumericDate(ticket.createdAt, locale) })}
                                </p>
                            </div>

                            <TrackedButton
                                analyticsId="admin-support-toggle-status"
                                type="button"
                                onClick={toggleStatus}
                                disabled={setStatus.isPending}
                                className="shrink-0 rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text disabled:opacity-50"
                            >
                                {ticket.status === 'open' ? t('close') : t('reopen')}
                            </TrackedButton>
                        </div>

                        <FormError error={error} />
                    </header>

                    <div className="space-y-3">
                        {ticket.messages.map((message) => (
                            <MessageBubble key={message.id} message={message} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function MessageBubble({ message }: { message: SupportMessage }) {
    const t = useTranslations('admin.support')
    const locale = useLocale()
    const inbound = message.direction === 'inbound'

    return (
        <article className={`rounded-2xl p-5 ring-1 ring-hairline ${inbound ? 'bg-surface' : 'bg-ember/[0.06]'}`}>
            <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-eyebrow uppercase text-text-faint">
                    {inbound ? t('fromRequester') : t('fromStaff')}
                </span>
                <span className="font-mono text-xs text-text-faint">
                    {formatNumericDate(message.createdAt, locale)}
                </span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-body leading-relaxed text-text-dim">{message.body}</p>
        </article>
    )
}
