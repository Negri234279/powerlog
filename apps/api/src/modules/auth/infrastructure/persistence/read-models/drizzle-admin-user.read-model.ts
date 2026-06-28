import { Inject, Injectable } from '@nestjs/common'
import { and, count, desc, eq, ilike, inArray, isNotNull, isNull, ne, type SQL, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type AdminUserFilter,
    type AdminUserPage,
    AdminUserReadModel,
    type AdminUserStats,
} from '../../../application/ports/admin-user.read-model'
import { users } from '../schema/users.schema'

@Injectable()
export class DrizzleAdminUserReadModel extends AdminUserReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async list(filter: AdminUserFilter, pagination: { limit: number; offset: number }): Promise<AdminUserPage> {
        const where = this.buildWhere(filter)

        const rows = await this.db
            .select({
                id: users.id,
                email: users.email,
                role: users.role,
                isAdmin: users.isAdmin,
                status: users.status,
                emailVerifiedAt: users.emailVerifiedAt,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(where)
            .orderBy(desc(users.createdAt))
            .limit(pagination.limit)
            .offset(pagination.offset)

        const [totals] = await this.db.select({ value: count() }).from(users).where(where)

        return {
            rows: rows.map((row) => ({
                id: row.id,
                email: row.email,
                role: row.role,
                isAdmin: row.isAdmin,
                status: row.status,
                emailVerified: row.emailVerifiedAt !== null,
                createdAt: row.createdAt,
            })),
            total: totals?.value ?? 0,
        }
    }

    async stats(): Promise<AdminUserStats> {
        const countWhere = (condition: SQL): SQL<number> =>
            sql<number>`sum(case when ${condition} then 1 else 0 end)::int`

        // Exclude GDPR-deleted (scrubbed) accounts from every figure.
        const [row] = await this.db
            .select({
                total: sql<number>`count(*)::int`,
                athletes: countWhere(eq(users.role, 'athlete')),
                coaches: countWhere(eq(users.role, 'coach')),
                admins: countWhere(eq(users.isAdmin, true)),
                verified: countWhere(isNotNull(users.emailVerifiedAt)),
                active: countWhere(eq(users.status, 'active')),
                disabled: countWhere(eq(users.status, 'disabled')),
                newLast7Days: countWhere(sql`${users.createdAt} >= now() - interval '7 days'`),
                newLast30Days: countWhere(sql`${users.createdAt} >= now() - interval '30 days'`),
            })
            .from(users)
            .where(ne(users.status, 'deleted'))

        return {
            total: Number(row?.total ?? 0),
            athletes: Number(row?.athletes ?? 0),
            coaches: Number(row?.coaches ?? 0),
            admins: Number(row?.admins ?? 0),
            verified: Number(row?.verified ?? 0),
            active: Number(row?.active ?? 0),
            disabled: Number(row?.disabled ?? 0),
            newLast7Days: Number(row?.newLast7Days ?? 0),
            newLast30Days: Number(row?.newLast30Days ?? 0),
        }
    }

    private buildWhere(filter: AdminUserFilter): SQL | undefined {
        const conditions: SQL[] = []
        if (filter.roles?.length) {
            conditions.push(inArray(users.role, filter.roles))
        }
        if (filter.isAdmin !== undefined) {
            conditions.push(eq(users.isAdmin, filter.isAdmin))
        }
        if (filter.verified !== undefined) {
            conditions.push(filter.verified ? isNotNull(users.emailVerifiedAt) : isNull(users.emailVerifiedAt))
        }
        if (filter.statuses?.length) {
            conditions.push(inArray(users.status, filter.statuses))
        }
        if (filter.search) {
            conditions.push(ilike(users.email, `%${filter.search}%`))
        }

        return conditions.length ? and(...conditions) : undefined
    }
}
