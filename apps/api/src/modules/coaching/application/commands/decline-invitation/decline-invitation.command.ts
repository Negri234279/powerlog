/** An athlete declines a pending coach invitation. */
export class DeclineInvitationCommand {
    constructor(
        public readonly athleteId: string,
        public readonly invitationId: string,
    ) {}
}
