/** A coach invites an athlete (by email) to be coached. */
export class InviteAthleteCommand {
    constructor(
        public readonly coachId: string,
        public readonly email: string,
    ) {}
}
