'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { Bell, Calendar, Check, Close, CreditCard, Dumbbell, Users } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'
import {
    type NotificationItem,
    useDeleteNotification,
    useDeleteReadNotifications,
    useMarkAllNotificationsRead,
    useMarkNotificationRead,
    useNotifications,
    useUnreadNotificationsCount,
} from '@/lib/graphql/hooks/use-notifications'

/** Where a notification takes you when clicked, if anywhere. */
function hrefFor(type: string): string | null {
    switch (type) {
        case 'coach_invitation':
        case 'coach_linked':
        case 'athlete_linked':
            return '/coaching'
        // Everything a coach put on your calendar lands in your training log.
        case 'session_planned':
        case 'mesocycle_assigned':
        case 'mesocycle_week_generated':
            return '/workouts'
        // Everything about the subscription is decided on the plan page — including
        // fixing the card, which is a click away from there.
        case 'subscription_activated':
        case 'subscription_canceled':
        case 'subscription_payment_failed':
            return '/profile/plan'
        default:
            return null
    }
}

/** Defensive parse of a notification's JSON `data` blob. */
function parseData(raw: string): Record<string, unknown> {
    try {
        const parsed: unknown = JSON.parse(raw)
        return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {}
    } catch {
        return {}
    }
}

/** Localized "2 hours ago"-style label from an ISO timestamp. */
function useRelativeTime() {
    const locale = useLocale()
    const rtf = useMemo(() => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }), [locale])

    return (iso: string): string => {
        const diffSec = Math.round((new Date(iso).getTime() - Date.now()) / 1000)

        if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second')

        const diffMin = Math.round(diffSec / 60)
        if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute')

        const diffHour = Math.round(diffMin / 60)
        if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour')

        return rtf.format(Math.round(diffHour / 24), 'day')
    }
}

/** Notification bell + dropdown inbox. Lives in the authed top bar. */
export function NotificationBell() {
    const t = useTranslations('notifications')
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const { data: unread } = useUnreadNotificationsCount()
    const { data, isLoading } = useNotifications(open)
    const markRead = useMarkNotificationRead()
    const markAll = useMarkAllNotificationsRead()
    const remove = useDeleteNotification()
    const clearRead = useDeleteReadNotifications()

    const count = unread ?? 0
    const items = data?.items ?? []
    const hasUnread = count > 0 || items.some((n) => n.readAt === null)
    const hasRead = items.some((n) => n.readAt !== null)

    // Close the panel on outside click or Escape.
    useEffect(() => {
        if (!open) return

        function onClick(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
        }
        function onKey(event: KeyboardEvent) {
            if (event.key === 'Escape') setOpen(false)
        }

        document.addEventListener('mousedown', onClick)
        window.addEventListener('keydown', onKey)

        return () => {
            document.removeEventListener('mousedown', onClick)
            window.removeEventListener('keydown', onKey)
        }
    }, [open])

    function onItemClick(notification: NotificationItem) {
        if (notification.readAt === null) markRead.mutate(notification.id)

        const href = hrefFor(notification.type)
        if (href) {
            setOpen(false)
            router.push(href)
        }
    }

    return (
        <div ref={containerRef} className="relative">
            <TrackedButton
                analyticsId="notifications-toggle"
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-label={t('title')}
                aria-expanded={open}
                className="relative grid size-9 place-items-center rounded-full text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text active:scale-[0.98]"
            >
                <Bell className="size-4.5" />
                {count > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-ember px-1 font-mono text-[10px] leading-4 text-bg">
                        {count > 9 ? '9+' : count}
                    </span>
                ) : null}
            </TrackedButton>

            {open ? (
                <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl bg-shell p-1.5 shadow-xl ring-1 ring-hairline">
                    <div className="inset-hi rounded-[calc(1rem-0.25rem)] bg-surface">
                        <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
                            <p className="font-mono text-eyebrow uppercase text-text-faint">{t('title')}</p>
                            <div className="flex items-center gap-3">
                                {hasUnread ? (
                                    <TrackedButton
                                        analyticsId="notifications-mark-all"
                                        type="button"
                                        onClick={() => markAll.mutate()}
                                        disabled={markAll.isPending}
                                        className="text-xs text-text-dim transition-colors duration-300 hover:text-text disabled:opacity-50"
                                    >
                                        {t('markAllRead')}
                                    </TrackedButton>
                                ) : null}
                                {hasRead ? (
                                    <TrackedButton
                                        analyticsId="notifications-clear-read"
                                        type="button"
                                        onClick={() => clearRead.mutate()}
                                        disabled={clearRead.isPending}
                                        className="text-xs text-text-dim transition-colors duration-300 hover:text-text disabled:opacity-50"
                                    >
                                        {t('clearRead')}
                                    </TrackedButton>
                                ) : null}
                            </div>
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {isLoading ? (
                                <p className="px-4 py-6 text-sm text-text-dim">{t('loading')}</p>
                            ) : items.length === 0 ? (
                                <p className="px-4 py-8 text-center text-sm text-text-faint">{t('empty')}</p>
                            ) : (
                                <ul className="divide-y divide-hairline">
                                    {items.map((n) => (
                                        <NotificationRow
                                            key={n.id}
                                            notification={n}
                                            onOpen={() => onItemClick(n)}
                                            onMarkRead={() => markRead.mutate(n.id)}
                                            onDelete={() => remove.mutate(n.id)}
                                        />
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}

/** Small round action on a row (mark read / remove). Kept always visible rather
 *  than revealed on hover: the panel is used on touch too, where there is none. */
function RowAction({
    analyticsId,
    label,
    onClick,
    children,
    danger = false,
}: {
    analyticsId: string
    label: string
    onClick: () => void
    children: ReactNode
    danger?: boolean
}) {
    return (
        <TrackedButton
            analyticsId={analyticsId}
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full text-text-faint transition-colors duration-200 hover:bg-white/[0.06]',
                danger ? 'hover:text-ember' : 'hover:text-text',
            )}
        >
            {children}
        </TrackedButton>
    )
}

function NotificationRow({
    notification,
    onOpen,
    onMarkRead,
    onDelete,
}: {
    notification: NotificationItem
    onOpen: () => void
    onMarkRead: () => void
    onDelete: () => void
}) {
    const t = useTranslations('notifications')
    const relative = useRelativeTime()
    const unread = notification.readAt === null

    const { icon, message } = describe(notification, t)

    return (
        <li
            className={cn(
                'flex items-start gap-2 px-4 py-3 transition-colors duration-200 hover:bg-white/[0.03]',
                unread && 'bg-white/[0.02]',
            )}
        >
            {/* The row's own button: opening it marks it read and navigates. The
                actions below are siblings — a button can't be nested in a button. */}
            <TrackedButton
                analyticsId="notification-item"
                type="button"
                onClick={onOpen}
                className="flex min-w-0 flex-1 items-start gap-3 text-left"
            >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-white/[0.05] text-text-dim ring-1 ring-hairline">
                    {icon}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm text-text">{message}</span>
                    <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-widest text-text-faint">
                        {relative(notification.createdAt)}
                    </span>
                </span>
            </TrackedButton>

            <span className="flex items-center gap-0.5">
                {unread ? (
                    <>
                        <span className="mr-0.5 size-2 shrink-0 rounded-full bg-ember" />
                        <RowAction analyticsId="notification-mark-read" label={t('markRead')} onClick={onMarkRead}>
                            <Check className="size-3.5" />
                        </RowAction>
                    </>
                ) : null}
                <RowAction analyticsId="notification-delete" label={t('delete')} onClick={onDelete} danger>
                    <Close className="size-3.5" />
                </RowAction>
            </span>
        </li>
    )
}

/** Map a notification's type + payload to an icon and a localized message. */
function describe(
    notification: NotificationItem,
    t: ReturnType<typeof useTranslations<'notifications'>>,
): { icon: ReactNode; message: string } {
    const data = parseData(notification.data)

    const coach = typeof data['coachUsername'] === 'string' ? data['coachUsername'] : '—'
    const athlete = typeof data['athleteUsername'] === 'string' ? data['athleteUsername'] : '—'
    const name = typeof data['name'] === 'string' ? data['name'] : '—'
    const week = typeof data['week'] === 'number' ? data['week'] : 0
    const sessions = typeof data['sessions'] === 'number' ? data['sessions'] : 0
    const plan = typeof data['plan'] === 'string' ? data['plan'] : '—'
    const until =
        typeof data['currentPeriodEnd'] === 'string' ? new Date(data['currentPeriodEnd']).toLocaleDateString() : '—'

    switch (notification.type) {
        case 'coach_invitation':
            return { icon: <Users className="size-4" />, message: t('items.coachInvitation', { coach }) }
        case 'coach_linked':
            return { icon: <Users className="size-4" />, message: t('items.coachLinked', { coach }) }
        case 'athlete_linked':
            return { icon: <Users className="size-4" />, message: t('items.athleteLinked', { athlete }) }
        case 'session_planned':
            return { icon: <Calendar className="size-4" />, message: t('items.sessionPlanned', { coach }) }
        case 'mesocycle_assigned':
            return { icon: <Dumbbell className="size-4" />, message: t('items.mesocycleAssigned', { coach, name }) }
        case 'mesocycle_week_generated':
            return {
                icon: <Calendar className="size-4" />,
                message: t('items.mesocycleWeekGenerated', { coach, week, sessions }),
            }
        case 'subscription_activated':
            return { icon: <CreditCard className="size-4" />, message: t('items.subscriptionActivated', { plan }) }
        case 'subscription_canceled':
            // Not "goodbye": they keep the plan until the period they paid for ends.
            return { icon: <CreditCard className="size-4" />, message: t('items.subscriptionCanceled', { until }) }
        case 'subscription_payment_failed':
            return { icon: <CreditCard className="size-4" />, message: t('items.subscriptionPaymentFailed') }
        default:
            return { icon: <Bell className="size-4" />, message: t('items.generic') }
    }
}
