import type { NotificationType } from '../notification-type'

/** Arbitrary, type-specific payload stored as jsonb (e.g. invitation ids). */
export type NotificationData = Record<string, unknown>

export interface NotificationProps {
    id: string
    userId: string
    type: NotificationType
    data: NotificationData
    readAt: Date | null
    createdAt: Date
}

/**
 * `NotificationEntity` — a single in-app notification for a user. Plain entity
 * (not an aggregate root; no domain events). `userId` is a soft reference to the
 * auth user. Read state is the only mutable bit.
 */
export class NotificationEntity {
    private constructor(private readonly props: NotificationProps) {}

    /** Create a fresh, unread notification. Id + timestamp come from the app. */
    static create(input: {
        id: string
        userId: string
        type: NotificationType
        data: NotificationData
        now: Date
    }): NotificationEntity {
        return new NotificationEntity({
            id: input.id,
            userId: input.userId,
            type: input.type,
            data: input.data,
            readAt: null,
            createdAt: input.now,
        })
    }

    /** Reconstruct from persistence. */
    static rehydrate(props: NotificationProps): NotificationEntity {
        return new NotificationEntity(props)
    }

    isRead(): boolean {
        return this.props.readAt !== null
    }

    get id(): string {
        return this.props.id
    }
    get userId(): string {
        return this.props.userId
    }
    get type(): NotificationType {
        return this.props.type
    }
    get data(): NotificationData {
        return this.props.data
    }
    get readAt(): Date | null {
        return this.props.readAt
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
}
