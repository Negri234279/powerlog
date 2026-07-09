import { type SessionPlanContext, SessionPlanContextReader } from '../../../src/shared/contracts/session-plan-context'
import { SessionPlanApplier, type SessionPlanInput } from '../../../src/shared/contracts/session-plan-applier'

/** Returns a canned context, or null to stand for "not programmable". */
export class StubSessionPlanContextReader extends SessionPlanContextReader {
    constructor(private readonly context: SessionPlanContext | null) {
        super()
    }

    async read(): Promise<SessionPlanContext | null> {
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
