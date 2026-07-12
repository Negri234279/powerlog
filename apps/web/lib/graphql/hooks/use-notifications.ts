import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { MyNotificationsQuery } from '@/lib/graphql/__generated__/graphql'
import { gqlRequest } from '@/lib/graphql/client'
import {
    DeleteNotificationDocument,
    DeleteReadNotificationsDocument,
    MarkAllNotificationsReadDocument,
    MarkNotificationReadDocument,
    MyNotificationsDocument,
    UnreadNotificationsCountDocument,
} from '@/lib/graphql/operations/notifications'

export type NotificationItem = MyNotificationsQuery['myNotifications']['items'][number]

// All notification queries share this prefix, so invalidating it also refetches
// the unread badge.
const NOTIFICATIONS_KEY = ['notifications'] as const
const UNREAD_KEY = ['notifications', 'unread'] as const

/** The bell badge. The realtime stream (`useRealtime`) invalidates this the moment
 *  a notification is created; the slow poll is just the fallback for when the
 *  stream is down (proxy hiccup, API restart, a browser without EventSource). */
export function useUnreadNotificationsCount() {
    return useQuery({
        queryKey: UNREAD_KEY,
        queryFn: async () => (await gqlRequest(UnreadNotificationsCountDocument)).unreadNotificationsCount,
        refetchInterval: 5 * 60_000,
        retry: false,
    })
}

/** The inbox list. Lazy: only fetched once the panel is opened. */
export function useNotifications(enabled: boolean) {
    return useQuery({
        queryKey: NOTIFICATIONS_KEY,
        queryFn: async () => (await gqlRequest(MyNotificationsDocument, { limit: 20 })).myNotifications,
        enabled,
        retry: false,
    })
}

function useInvalidateNotifications() {
    const qc = useQueryClient()

    return () => {
        void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY })
    }
}

export function useMarkNotificationRead() {
    const invalidate = useInvalidateNotifications()

    return useMutation({
        mutationFn: (id: string) => gqlRequest(MarkNotificationReadDocument, { id }),
        onSuccess: invalidate,
    })
}

export function useMarkAllNotificationsRead() {
    const invalidate = useInvalidateNotifications()

    return useMutation({
        mutationFn: () => gqlRequest(MarkAllNotificationsReadDocument),
        onSuccess: invalidate,
    })
}

/** Dismiss one notification for good — read or not (the row's ✕). */
export function useDeleteNotification() {
    const invalidate = useInvalidateNotifications()

    return useMutation({
        mutationFn: (id: string) => gqlRequest(DeleteNotificationDocument, { id }),
        onSuccess: invalidate,
    })
}

/** Clear the inbox of everything already read. Unread ones stay: the user can't
 *  lose something they never saw. */
export function useDeleteReadNotifications() {
    const invalidate = useInvalidateNotifications()

    return useMutation({
        mutationFn: () => gqlRequest(DeleteReadNotificationsDocument),
        onSuccess: invalidate,
    })
}
