export class AssignMesocycleToAthleteCommand {
    constructor(
        public readonly coachId: string,
        public readonly mesocycleId: string,
        public readonly athleteId: string,
        /** ISO date (YYYY-MM-DD) anchoring week 1 of the athlete's copy. */
        public readonly startDate?: string,
    ) {}
}
