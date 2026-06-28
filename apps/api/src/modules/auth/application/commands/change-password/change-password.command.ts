/**
 * Change (or set) the authenticated user's password. `currentPassword` is
 * required when the account already has one; omit it for Google-only accounts
 * setting a password for the first time.
 */
export class ChangePasswordCommand {
    constructor(
        public readonly userId: string,
        public readonly newPassword: string,
        public readonly currentPassword?: string,
    ) {}
}
