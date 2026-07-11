'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { Bell, Users } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'
import {
    type NotificationItem,
    useMarkAllNotificationsRead,
    useMarkNotificationRead,
    useNotifications,
    useUnreadNotificationsCount,
} from '@/lib/graphql/hooks/use-notifications'

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
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const { data: unread } = useUnreadNotificationsCount()
    const { data, isLoading } = useNotifications(open)
    const markRead = useMarkNotificationRead()
    const markAll = useMarkAllNotificationsRead()

    const count = unread ?? 0
    const items = data?.items ?? []
    const hasUnread = count > 0 || items.some((n) => n.readAt === null)

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
                        </div>

                        <div className="max-h-96 overflow-y-auto">
                            {isLoading ? (
                                <p className="px-4 py-6 text-sm text-text-dim">{t('loading')}</p>
                            ) : items.length === 0 ? (
                                <p className="px-4 py-8 text-center text-sm text-text-faint">{t('empty')}</p>
                            ) : (
                                <ul className="divide-y divide-hairline">
                                    {items.map((n) => (
                                        <NotificationRow key={n.id} notification={n} onClick={() => onItemClick(n)} />
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

function NotificationRow({ notification, onClick }: { notification: NotificationItem; onClick: () => void }) {
    const t = useTranslations('notifications')
    const relative = useRelativeTime()
    const unread = notification.readAt === null

    const { icon, message } = describe(notification, t)

    return (
        <li>
            <TrackedButton
                analyticsId="notification-item"
                type="button"
                onClick={onClick}
                className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-white/[0.03]',
                    unread && 'bg-white/[0.02]',
                )}
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
                {unread ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-ember" /> : null}
            </TrackedButton>
        </li>
    )
}

/** Map a notification's type + payload to an icon and a localized message. */
function describe(
    notification: NotificationItem,
    t: ReturnType<typeof useTranslations<'notifications'>>,
): { icon: ReactNode; message: string } {
    const data = parseData(notification.data)

    switch (notification.type) {
        case 'coach_invitation':
            return {
                icon: <Users className="size-4" />,
                message: t('items.coachInvitation', {
                    coach: typeof data['coachUsername'] === 'string' ? data['coachUsername'] : '—',
                }),
            }
        default:
            return { icon: <Bell className="size-4" />, message: t('items.generic') }
    }
}
