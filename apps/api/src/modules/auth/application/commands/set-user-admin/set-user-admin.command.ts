/** Admin action: grant or revoke platform admin for a user. */
export class SetUserAdminCommand {
    constructor(
        public readonly actingUserId: string,
        public readonly targetUserId: string,
        public readonly isAdmin: boolean,
    ) {}
}
