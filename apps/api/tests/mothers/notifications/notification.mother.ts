import {
    NotificationEntity,
    type NotificationData,
} from '../../../src/modules/notifications/domain/entities/notification.entity'
import type { NotificationType } from '../../../src/modules/notifications/domain/notification-type'

const DEFAULT_NOW = new Date('2026-01-01T00:00:00.000Z')

/**
 * Object Mother for notifications. Fluent builder with sane defaults:
 *   NotificationMother.create().forUser("u-1").build()        // unread
 *   NotificationMother.create().readAtTime(now).build()       // read
 */
export class NotificationMother {
    private id = '99999999-9999-4999-8999-999999999999'
    private userId = 'u-1'
    private type: NotificationType = 'coach_invitation'
    private data: NotificationData = { invitationId: 'inv-1', coachId: 'coach-1', coachUsername: 'coachy' }
    private readAt: Date | null = null
    private createdAt = DEFAULT_NOW

    static create(): NotificationMother {
        return new NotificationMother()
    }

    withId(id: string): this {
        this.id = id
        return this
    }

    forUser(userId: string): this {
        this.userId = userId
        return this
    }

    ofType(type: NotificationType): this {
        this.type = type
        return this
    }

    withData(data: NotificationData): this {
        this.data = data
        return this
    }

    createdAtTime(at: Date): this {
        this.createdAt = at
        return this
    }

    readAtTime(at: Date = DEFAULT_NOW): this {
        this.readAt = at
        return this
    }

    build(): NotificationEntity {
        return NotificationEntity.rehydrate({
            id: this.id,
            userId: this.userId,
            type: this.type,
            data: this.data,
            readAt: this.readAt,
            createdAt: this.createdAt,
        })
    }
}
