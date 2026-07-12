import type { NotificationEntity } from '../entities/notification.entity'

/** Keyset cursor: the (createdAt, id) of the last row of the previous page. */
export interface NotificationCursor {
    createdAt: Date
    id: string
}

/** Filter for the notification list: always user-scoped, keyset-paginated. */
export interface NotificationListFilter {
    userId: string
    /** Page size (the impl fetches one extra row to compute `hasNextPage`). */
    limit: number
    cursor?: NotificationCursor
}

/** A keyset page: trimmed rows plus whether another page follows. */
export interface NotificationSlice {
    items: NotificationEntity[]
    hasNextPage: boolean
}

/**
 * Persistence port for notifications. Reads are user-scoped and keyset-paginated
 * (newest first); read-state changes are scoped UPDATEs so a user can only touch
 * their own rows.
 */
export abstract class NotificationRepository {
    abstract create(notification: NotificationEntity): Promise<void>
    abstract list(filter: NotificationListFilter): Promise<NotificationSlice>
    abstract countUnread(userId: string): Promise<number>
    /** Mark one notification read; returns true if a row was changed. */
    abstract markRead(userId: string, id: string, now: Date): Promise<boolean>
    /** Mark every unread notification read; returns how many were changed. */
    abstract markAllRead(userId: string, now: Date): Promise<number>
    /** Delete one notification; returns true if a row was deleted. */
    abstract delete(userId: string, id: string): Promise<boolean>
    /** Delete every already-read notification; returns how many were deleted.
     *  Unread ones are left alone — you can't lose what you haven't seen. */
    abstract deleteRead(userId: string): Promise<number>
}
