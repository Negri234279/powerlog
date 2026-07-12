export class LeaveCoachCommand {
    constructor(
        public readonly athleteId: string,
        public readonly coachId: string,
    ) {}
}
