export class DeleteWorkoutSessionCommand {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
    ) {}
}
