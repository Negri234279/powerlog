import type { AccountStatus } from '../../domain/entities/user.entity'
import type { UserRoleValue } from '../../domain/value-objects/user-role.vo'

/** Filters for the admin user listing. All optional; arrays mean "any of". */
export interface AdminUserFilter {
    roles?: UserRoleValue[]
    isAdmin?: boolean
    verified?: boolean
    statuses?: AccountStatus[]
    /** Case-insensitive match on email. */
    search?: string
}

/** One row of the admin user listing (auth-owned fields only). */
export interface AdminUserListItem {
    id: string
    email: string
    role: UserRoleValue
    isAdmin: boolean
    status: AccountStatus
    emailVerified: boolean
    createdAt: Date
}

export interface AdminUserPage {
    rows: AdminUserListItem[]
    /** Total rows matching the filter (ignoring pagination), for the UI. */
    total: number
}

/** Aggregate counts for the admin dashboard (excludes GDPR-deleted accounts). */
export interface AdminUserStats {
    total: number
    athletes: number
    coaches: number
    admins: number
    verified: number
    active: number
    disabled: number
    newLast7Days: number
    newLast30Days: number
}

/**
 * Read-only port for admin user listings and aggregate stats. Reads `users`
 * directly (auth-owned); the handle/avatar live in the profile module and are
 * enriched by the query handler via `ProfileSnapshotReader`.
 */
export abstract class AdminUserReadModel {
    abstract list(filter: AdminUserFilter, pagination: { limit: number; offset: number }): Promise<AdminUserPage>
    abstract stats(): Promise<AdminUserStats>
}
