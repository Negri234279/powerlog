export class CompleteWorkoutSessionCommand {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
    ) {}
}
