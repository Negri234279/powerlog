/** A coach invites an athlete (by their public username) to be coached. */
export class InviteAthleteCommand {
    constructor(
        public readonly coachId: string,
        public readonly athleteUsername: string,
    ) {}
}
