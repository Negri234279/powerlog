/** Soft-delete the authenticated user's own account (GDPR right to erasure). */
export class DeleteAccountCommand {
    constructor(public readonly userId: string) {}
}
