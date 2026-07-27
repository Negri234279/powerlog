import { Inject, Injectable } from '@nestjs/common'
import { eq, inArray } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../database/database.module'
import { PresenceStore } from '../presence-store'
import { userPresence } from './schema/user-presence.schema'

@Injectable()
export class DrizzlePresenceStore extends PresenceStore {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async touch(userId: string, at: Date): Promise<void> {
        await this.db
            .insert(userPresence)
            .values({ userId, lastSeenAt: at })
            .onConflictDoUpdate({ target: userPresence.userId, set: { lastSeenAt: at } })
    }

    async lastSeenAt(userId: string): Promise<Date | null> {
        const [row] = await this.db
            .select({ lastSeenAt: userPresence.lastSeenAt })
            .from(userPresence)
            .where(eq(userPresence.userId, userId))
            .limit(1)

        return row?.lastSeenAt ?? null
    }

    async lastSeenOf(userIds: string[]): Promise<Map<string, Date>> {
        if (userIds.length === 0) return new Map()

        const rows = await this.db
            .select({ userId: userPresence.userId, lastSeenAt: userPresence.lastSeenAt })
            .from(userPresence)
            .where(inArray(userPresence.userId, userIds))
            
        return new Map(rows.map((row) => [row.userId, row.lastSeenAt]))
    }
}
