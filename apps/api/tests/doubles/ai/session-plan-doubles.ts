import { type SessionPlanContext, SessionPlanContextReader } from '../../../src/shared/contracts/session-plan-context'
import { SessionPlanApplier, type SessionPlanInput } from '../../../src/shared/contracts/session-plan-applier'

/**
 * Returns a canned context, or null to stand for "not programmable". Records the
 * scope it was asked for, so a test can assert that a single-exercise draft is
 * built — and later refined — against that exercise alone.
 */
export class StubSessionPlanContextReader extends SessionPlanContextReader {
    readonly readCalls: { sessionId: string; entryId?: string }[] = []

    constructor(private readonly context: SessionPlanContext | null) {
        super()
    }

    async read(_userId: string, sessionId: string, entryId?: string): Promise<SessionPlanContext | null> {
        this.readCalls.push(entryId === undefined ? { sessionId } : { sessionId, entryId })

        return this.context
    }
}

/** Records what workouts would have been asked to write, or refuses to. */
export class RecordingSessionPlanApplier extends SessionPlanApplier {
    readonly applied: SessionPlanInput[] = []

    constructor(private readonly failWith?: Error) {
        super()
    }

    async apply(input: SessionPlanInput): Promise<void> {
        if (this.failWith) throw this.failWith
        this.applied.push(input)
    }
}
