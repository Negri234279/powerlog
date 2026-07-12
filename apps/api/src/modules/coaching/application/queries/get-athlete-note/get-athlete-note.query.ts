/** A coach reads their own private note on an athlete. */
export class GetAthleteNoteQuery {
    constructor(
        public readonly coachId: string,
        public readonly athleteId: string,
    ) {}
}
