/** A coach sets (or clears, when empty) their private note on an athlete. */
export class SetAthleteNoteCommand {
    constructor(
        public readonly coachId: string,
        public readonly athleteId: string,
        public readonly body: string,
    ) {}
}
