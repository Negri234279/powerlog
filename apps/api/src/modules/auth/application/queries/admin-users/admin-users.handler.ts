import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { Entitlements } from '../../../../../shared/contracts/entitlements'
import { PlanDirectory } from '../../../../../shared/contracts/plan-membership'
import { ProfileSnapshotReader } from '../../../../../shared/contracts/profile-snapshot-reader'
import type { AccountStatus } from '../../../domain/entities/user.entity'
import type { UserRoleValue } from '../../../domain/value-objects/user-role.vo'
import { AdminUserReadModel } from '../../ports/admin-user.read-model'
import { AdminUsersQuery } from './admin-users.query'

/**
 * Admin view of a user: auth-owned fields + the handle from the profile module
 * and the effective plan from billing.
 */
export interface AdminUserView {
    id: string
    email: string
    username: string | null
    role: UserRoleValue
    isAdmin: boolean
    status: AccountStatus
    emailVerified: boolean
    /** Slug of the plan in force — the free plan of their role when they don't pay. */
    plan: string | null
    createdAt: Date
}

export interface AdminUsersPageView {
    rows: AdminUserView[]
    total: number
    limit: number
    offset: number
}

@QueryHandler(AdminUsersQuery)
export class AdminUsersHandler implements IQueryHandler<AdminUsersQuery, AdminUsersPageView> {
    constructor(
        private readonly readModel: AdminUserReadModel,
        private readonly profiles: ProfileSnapshotReader,
        private readonly entitlements: Entitlements,
        private readonly planDirectory: PlanDirectory,
    ) {}

    async execute(query: AdminUsersQuery): Promise<AdminUsersPageView> {
        // The plan filter has to reach the SQL: resolving each row's plan below and
        // filtering afterwards would filter the page rather than the listing, and
        // `total` would count users the admin never asked to see. So billing turns
        // the picked slugs into sets first, and the read model matches on them.
        const planMembership = query.plans?.length ? await this.planDirectory.membership(query.plans) : undefined
        const filter = { ...query.filter, planMembership }
        const page = await this.readModel.list(filter, { limit: query.limit, offset: query.offset })

        // The handle lives in the profile module and the plan in billing; both are
        // resolved per row (bounded by the page size) through their shared ports,
        // so auth imports neither. A missing profile (e.g. mid-provision), one that
        // fails to rehydrate (e.g. a legacy/invalid display name), or a plan that
        // can't be resolved (a broken catalog) yields null for that cell rather
        // than failing the whole listing — an admin looking at a misconfiguration
        // needs the page to load most of all.
        const rows = await Promise.all(
            page.rows.map(async (row) => {
                const [snapshot, entitlements] = await Promise.all([
                    this.profiles.read(row.id).catch(() => null),
                    this.entitlements.forUser(row.id).catch(() => null),
                ])

                return {
                    id: row.id,
                    email: row.email,
                    username: snapshot?.username ?? null,
                    role: row.role,
                    isAdmin: row.isAdmin,
                    status: row.status,
                    emailVerified: row.emailVerified,
                    // The cell shows the "primary" plan: the coach one when they
                    // coach, their athlete one otherwise (plans are per-audience now).
                    plan: entitlements ? (entitlements.coach?.plan ?? entitlements.athlete.plan) : null,
                    createdAt: row.createdAt,
                }
            }),
        )

        return { rows, total: page.total, limit: query.limit, offset: query.offset }
    }
}
