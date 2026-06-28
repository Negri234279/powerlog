/** Read a single workout session owned by the user (full tree). */
export class GetWorkoutSessionQuery {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
    ) {}
}
