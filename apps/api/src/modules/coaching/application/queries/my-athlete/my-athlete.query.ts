/** One athlete linked to the calling coach, by id. */
export class MyAthleteQuery {
    constructor(
        public readonly coachId: string,
        public readonly athleteId: string,
    ) {}
}
