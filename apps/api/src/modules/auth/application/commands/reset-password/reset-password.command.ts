/** Complete a password reset using the opaque token from the reset email. */
export class ResetPasswordCommand {
    constructor(
        public readonly token: string,
        public readonly newPassword: string,
    ) {}
}
