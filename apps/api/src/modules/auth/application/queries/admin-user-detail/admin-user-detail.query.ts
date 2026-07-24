/** Admin-only: the full detail of one user (admin-guarded at the resolver). */
export class AdminUserDetailQuery {
    constructor(public readonly userId: string) {}
}
