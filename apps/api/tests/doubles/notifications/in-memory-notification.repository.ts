import { NotificationEntity } from '../../../src/modules/notifications/domain/entities/notification.entity'
import {
    type NotificationListFilter,
    type NotificationSlice,
    NotificationRepository,
} from '../../../src/modules/notifications/domain/repositories/notification.repository'

/**
 * In-memory NotificationRepository implementing the real abstract interface.
 * Mirrors the Drizzle impl's (createdAt, id) DESC keyset ordering and scoped
 * read-state updates. Read-state is tracked separately so stored entities stay
 * immutable; `list` reflects it via rehydration is unnecessary — tests assert
 * through `countUnread`/the returned entities.
 */
export class InMemoryNotificationRepository extends NotificationRepository {
    private readonly items: NotificationEntity[] = []
    private readonly readAt = new Map<string, Date>()

    constructor(seed: NotificationEntity[] = []) {
        super()
        this.items.push(...seed)
        for (const n of seed) if (n.readAt) this.readAt.set(n.id, n.readAt)
    }

    async create(notification: NotificationEntity): Promise<void> {
        this.items.push(notification)
        if (notification.readAt) this.readAt.set(notification.id, notification.readAt)
    }

    async list(filter: NotificationListFilter): Promise<NotificationSlice> {
        const ordered = [...this.items]
            .filter((n) => n.userId === filter.userId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1))

        const after = filter.cursor
            ? ordered.filter((n) => {
                  const c = filter.cursor!
                  return (
                      n.createdAt.getTime() < c.createdAt.getTime() ||
                      (n.createdAt.getTime() === c.createdAt.getTime() && n.id < c.id)
                  )
              })
            : ordered

        const hasNextPage = after.length > filter.limit
        // Reflect read-state (entities are immutable; rehydrate with readAt).
        const items = after.slice(0, filter.limit).map((n) => this.withReadState(n))
        return { hasNextPage, items }
    }

    private withReadState(n: NotificationEntity): NotificationEntity {
        const readAt = this.readAt.get(n.id) ?? null
        if (readAt === n.readAt) return n
        return NotificationEntity.rehydrate({
            id: n.id,
            userId: n.userId,
            type: n.type,
            data: n.data,
            readAt,
            createdAt: n.createdAt,
        })
    }

    async countUnread(userId: string): Promise<number> {
        return this.items.filter((n) => n.userId === userId && !this.readAt.has(n.id)).length
    }

    async markRead(userId: string, id: string, now: Date): Promise<boolean> {
        const match = this.items.find((n) => n.id === id && n.userId === userId && !this.readAt.has(n.id))
        if (!match) return false
        this.readAt.set(id, now)
        return true
    }

    async markAllRead(userId: string, now: Date): Promise<number> {
        const unread = this.items.filter((n) => n.userId === userId && !this.readAt.has(n.id))
        for (const n of unread) this.readAt.set(n.id, now)
        return unread.length
    }

    async delete(userId: string, id: string): Promise<boolean> {
        const index = this.items.findIndex((n) => n.id === id && n.userId === userId)
        if (index === -1) return false

        this.items.splice(index, 1)
        this.readAt.delete(id)

        return true
    }

    async deleteRead(userId: string): Promise<number> {
        const read = this.items.filter((n) => n.userId === userId && this.readAt.has(n.id))
        for (const n of read) {
            this.items.splice(this.items.indexOf(n), 1)
            this.readAt.delete(n.id)
        }

        return read.length
    }

    /** Test inspection: every stored notification. */
    all(): NotificationEntity[] {
        return [...this.items]
    }
}
