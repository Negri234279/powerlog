/**
 * Synchronous request (QueryBus) for a user's training figures. Lives in the
 * shared kernel so the auth-side admin detail can dispatch it and the workouts
 * module can handle it without a cross-module import.
 */
export class GetUserTrainingQuery {
    constructor(public readonly userId: string) {}
}
