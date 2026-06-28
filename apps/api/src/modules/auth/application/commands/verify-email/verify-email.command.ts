/** Confirm email ownership using the opaque token from the verification email. */
export class VerifyEmailCommand {
    constructor(public readonly token: string) {}
}
