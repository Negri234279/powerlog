import type { UserRoleValue } from '../../../domain/value-objects/user-role.vo'

/** Admin action: set a user's role (athlete ↔ coach). */
export class SetUserRoleCommand {
    constructor(
        public readonly targetUserId: string,
        public readonly role: UserRoleValue,
    ) {}
}
