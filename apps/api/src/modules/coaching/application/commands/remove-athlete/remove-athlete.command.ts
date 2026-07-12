export class RemoveAthleteCommand {
    constructor(
        public readonly coachId: string,
        public readonly athleteId: string,
    ) {}
}
