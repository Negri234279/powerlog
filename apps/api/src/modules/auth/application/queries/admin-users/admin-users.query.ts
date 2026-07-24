import type { AdminUserFilter } from '../../ports/admin-user.read-model'

/**
 * List users for the admin panel (filtered + offset-paginated).
 *
 * `plans` is separate from `filter` because it isn't one: the filter is what the
 * read model can match against `users`, and plan slugs are not — the handler
 * resolves them through the `PlanDirectory` first.
 */
export class AdminUsersQuery {
    constructor(
        public readonly filter: AdminUserFilter,
        public readonly limit: number,
        public readonly offset: number,
        /** Slugs of the plans to restrict to; empty/undefined means every plan. */
        public readonly plans?: string[],
    ) {}
}
