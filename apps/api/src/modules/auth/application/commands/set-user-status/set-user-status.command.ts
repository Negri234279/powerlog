/** Admin action: disable (suspend) or re-enable a user account. */
export class SetUserStatusCommand {
    constructor(
        public readonly actingUserId: string,
        public readonly targetUserId: string,
        public readonly disabled: boolean,
    ) {}
}
