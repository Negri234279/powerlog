/** A coach cancels a pending invitation they sent. */
export class CancelInvitationCommand {
    constructor(
        public readonly coachId: string,
        public readonly invitationId: string,
    ) {}
}
