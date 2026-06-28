/** Start the forgot-password flow: email a reset link if the account exists. */
export class ForgotPasswordCommand {
    constructor(public readonly email: string) {}
}
