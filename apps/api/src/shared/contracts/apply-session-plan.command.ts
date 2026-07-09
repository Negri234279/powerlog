import type { PrescribedSet } from './session-plan-applier'

/**
 * Synchronous request (CommandBus) to write an accepted plan's targets onto a
 * planned session. Lives in the shared kernel so the AI-side adapter can
 * dispatch it and the workouts module can handle it without a cross-module
 * import. Workouts revalidates ownership, status and set ids — it does not trust
 * the caller.
 */
export class ApplySessionPlanCommand {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
        public readonly sets: readonly PrescribedSet[],
    ) {}
}
