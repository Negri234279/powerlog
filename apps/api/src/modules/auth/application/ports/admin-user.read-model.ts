import type { PlanMembership } from '../../../../shared/contracts/plan-membership'
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
    /**
     * Restrict to the users on a set of plans, already resolved by billing into
     * sets this module can match against `users` — the plan itself lives in
     * billing, which auth may not join to. Present means the admin picked plans,
     * so an all-empty membership matches NO rows (nobody is on them) rather than
     * meaning "no filter"; the query handler leaves it undefined when nothing is
     * picked.
     */
    planMembership?: PlanMembership
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

/**
 * The auth-owned account fields for one user's admin detail — a superset of the
 * list row (adds units, whether they have a password, and updatedAt). The handle,
 * plan, billing, coaching and training come from other modules and are joined in
 * by the query handler.
 */
export interface AdminUserAccount {
    id: string
    email: string
    role: UserRoleValue
    isAdmin: boolean
    status: AccountStatus
    emailVerified: boolean
    /** false → a Google-only account with no password. */
    hasPassword: boolean
    /** Unit preference: "kg" | "lb". */
    units: string
    createdAt: Date
    updatedAt: Date
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
    /** The account fields for one user's detail, or null if no such user. */
    abstract byId(userId: string): Promise<AdminUserAccount | null>
}
