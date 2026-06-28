/** An athlete accepts a pending coach invitation, creating the link. */
export class AcceptInvitationCommand {
    constructor(
        public readonly athleteId: string,
        public readonly invitationId: string,
    ) {}
}
