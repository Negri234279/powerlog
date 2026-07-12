/** Public: resolve a pending invitation from its opaque signup-link token. */
export class GetCoachInvitationPreviewQuery {
    constructor(public readonly token: string) {}
}
