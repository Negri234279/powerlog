import { Inject, Injectable } from '@nestjs/common'
import { and, count, desc, eq, ilike, inArray, isNotNull, isNull, ne, notInArray, or, type SQL, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import type { PlanMembership } from '../../../../../shared/contracts/plan-membership'
import {
    type AdminUserAccount,
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

    async byId(userId: string): Promise<AdminUserAccount | null> {
        const [row] = await this.db
            .select({
                id: users.id,
                email: users.email,
                role: users.role,
                isAdmin: users.isAdmin,
                status: users.status,
                emailVerifiedAt: users.emailVerifiedAt,
                hashedPassword: users.hashedPassword,
                units: users.units,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1)

        if (!row) return null

        return {
            id: row.id,
            email: row.email,
            role: row.role,
            isAdmin: row.isAdmin,
            status: row.status,
            emailVerified: row.emailVerifiedAt !== null,
            hasPassword: row.hashedPassword !== null,
            units: row.units,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
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
        if (filter.planMembership) {
            conditions.push(this.onPlans(filter.planMembership))
        }

        return conditions.length ? and(...conditions) : undefined
    }

    /**
     * "Is on one of the selected plans", as SQL over `users` alone — billing
     * resolved the plans into these sets precisely so this stays a predicate and
     * not a join, which keeps `total` and the pagination honest.
     *
     * The second half is the free-plan fallback: someone of that role with no
     * entitling subscription is on the free plan of their audience.
     */
    private onPlans(membership: PlanMembership): SQL {
        const matches: SQL[] = []

        if (membership.subscriberIds.length) {
            matches.push(inArray(users.id, membership.subscriberIds))
        }
        if (membership.freeAudiences.length) {
            const free = [
                inArray(users.role, membership.freeAudiences),
                membership.entitledUserIds.length ? notInArray(users.id, membership.entitledUserIds) : undefined,
            ].filter((condition) => condition !== undefined)

            matches.push(and(...free) as SQL)
        }

        // Plans nobody is on. Without this the filter would collapse to `undefined`
        // and quietly list every user — the one wrong answer available here.
        return matches.length ? (or(...matches) as SQL) : sql`false`
    }
}
