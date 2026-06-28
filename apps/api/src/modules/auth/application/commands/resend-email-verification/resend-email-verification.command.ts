/** Re-issue and resend the email-verification link for the given user. */
export class ResendEmailVerificationCommand {
    constructor(public readonly userId: string) {}
}
