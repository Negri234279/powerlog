import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { ProfileSnapshotReader } from '../../../../../shared/contracts/profile-snapshot-reader'
import type { AccountStatus } from '../../../domain/entities/user.entity'
import type { UserRoleValue } from '../../../domain/value-objects/user-role.vo'
import { AdminUserReadModel } from '../../ports/admin-user.read-model'
import { AdminUsersQuery } from './admin-users.query'

/** Admin view of a user: auth-owned fields + the handle from the profile module. */
export interface AdminUserView {
    id: string
    email: string
    username: string | null
    role: UserRoleValue
    isAdmin: boolean
    status: AccountStatus
    emailVerified: boolean
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
    ) {}

    async execute(query: AdminUsersQuery): Promise<AdminUsersPageView> {
        const page = await this.readModel.list(query.filter, { limit: query.limit, offset: query.offset })

        // The handle lives in the profile module; resolve it per row (bounded by
        // the page size). A missing profile (e.g. mid-provision) — or one that
        // fails to rehydrate (e.g. a legacy/invalid display name) — yields null
        // rather than failing the whole listing.
        const rows = await Promise.all(
            page.rows.map(async (row) => {
                const snapshot = await this.profiles.read(row.id).catch(() => null)
                return {
                    id: row.id,
                    email: row.email,
                    username: snapshot?.username ?? null,
                    role: row.role,
                    isAdmin: row.isAdmin,
                    status: row.status,
                    emailVerified: row.emailVerified,
                    createdAt: row.createdAt,
                }
            }),
        )

        return { rows, total: page.total, limit: query.limit, offset: query.offset }
    }
}
