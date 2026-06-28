import type { AdminUserFilter } from '../../ports/admin-user.read-model'

/** List users for the admin panel (filtered + offset-paginated). */
export class AdminUsersQuery {
    constructor(
        public readonly filter: AdminUserFilter,
        public readonly limit: number,
        public readonly offset: number,
    ) {}
}
