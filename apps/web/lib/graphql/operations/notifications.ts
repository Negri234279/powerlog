import { graphql } from '@/lib/graphql/__generated__'

// ── Notifications inbox + bell ───────────────────────────────

export const MyNotificationsDocument = graphql(`
    query MyNotifications($limit: Int, $cursor: String) {
        myNotifications(limit: $limit, cursor: $cursor) {
            items {
                id
                type
                data
                readAt
                createdAt
            }
            nextCursor
            hasNextPage
        }
    }
`)

export const UnreadNotificationsCountDocument = graphql(`
    query UnreadNotificationsCount {
        unreadNotificationsCount
    }
`)

export const MarkNotificationReadDocument = graphql(`
    mutation MarkNotificationRead($id: ID!) {
        markNotificationRead(id: $id)
    }
`)

export const MarkAllNotificationsReadDocument = graphql(`
    mutation MarkAllNotificationsRead {
        markAllNotificationsRead
    }
`)

export const DeleteNotificationDocument = graphql(`
    mutation DeleteNotification($id: ID!) {
        deleteNotification(id: $id)
    }
`)

export const DeleteReadNotificationsDocument = graphql(`
    mutation DeleteReadNotifications {
        deleteReadNotifications
    }
`)
