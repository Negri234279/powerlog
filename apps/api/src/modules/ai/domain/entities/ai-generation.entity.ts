import {
    AiGenerationAlreadySettledError,
    AiGenerationNotQueuedError,
    InvalidAiGenerationRequestError,
} from '../errors/ai-generation.errors'
import type { GenerationKindVO } from '../value-objects/generation-kind.vo'
import { GenerationStatusVO } from '../value-objects/generation-status.vo'

/** Program a planned session, or one exercise entry of it. */
export interface SessionPlanRequest {
    sessionId: string
    /** Program only this exercise entry; null takes the whole session. */
    entryId: string | null
    /** Anything the athlete wants the model to know ("shoulder is sore"). */
    extraInfo: string | null
}

/** Design the template week of a training block. */
export interface MesocycleRequest {
    /** Set when a coach designs for one of their athletes; null → for themselves. */
    athleteId: string | null
    weeks: number
    /** The 0–6 offsets the athlete trains on. */
    trainingDays: number[]
    goal: string | null
    prompt: string | null
}

/** Revise a draft that already exists, of either kind. */
export interface RefinementRequest {
    draftId: string
    /** The athlete's own words. Untrusted input, framed as data for the model. */
    message: string
}

/**
 * What was asked for, keyed by the kind that names it. Persisted with the
 * generation rather than left in the job payload: a generation that never ran —
 * the worker died, Redis lost the job — must still be legible, both to the
 * athlete looking at it and to whoever re-drives it.
 */
export interface GenerationRequestByKind {
    session_plan: SessionPlanRequest
    session_plan_refinement: RefinementRequest
    mesocycle: MesocycleRequest
    mesocycle_refinement: RefinementRequest
}

export type AiGenerationRequest = GenerationRequestByKind[keyof GenerationRequestByKind]

export interface AiGenerationProps {
    id: string
    /** Who asked. A coach designing for an athlete is still the owner of the job. */
    userId: string
    kind: GenerationKindVO
    status: GenerationStatusVO
    request: AiGenerationRequest
    /** The draft this produced. Null until it succeeds. */
    draftId: string | null
    /**
     * Why it failed, as the stable `code` of the domain error that stopped it (or
     * `UNKNOWN`). A code, never the model's or the provider's words: this is shown
     * to the athlete and counted as a metric label.
     */
    failureCode: string | null
    createdAt: Date
    updatedAt: Date
}

/** Shape of a failure code: a stable, low-cardinality identifier. */
const FAILURE_CODE = /^[A-Z][A-Z0-9_]{2,63}$/

/**
 * `AiGenerationAggregate` — one LLM job in flight. It exists because the answer
 * takes ~20–30s in production and nothing that slow belongs inside the lifetime
 * of an HTTP request: the mutation queues one of these and returns, a worker runs
 * it, and the athlete's browser learns the outcome from this row.
 *
 * It deliberately owns no draft data. A draft is a *valid proposal* — that is its
 * invariant — so a half-finished one cannot be represented. The draft is created
 * whole when the model answers, and this aggregate only points at it.
 *
 * Aggregate root without domain events (the settled event is an integration
 * event, raised by the application layer), so it does not extend `AggregateRoot`
 * — same call as `AiPlanDraftAggregate`.
 *
 * `succeeded` and `failed` are terminal.
 */
export class AiGenerationAggregate {
    private constructor(private readonly props: AiGenerationProps) {}

    static queue(input: {
        id: string
        userId: string
        kind: GenerationKindVO
        request: AiGenerationRequest
        now: Date
    }): AiGenerationAggregate {
        assertRequestMatchesKind(input.kind, input.request)

        return new AiGenerationAggregate({
            id: input.id,
            userId: input.userId,
            kind: input.kind,
            status: GenerationStatusVO.queued(),
            request: input.request,
            draftId: null,
            failureCode: null,
            createdAt: input.now,
            updatedAt: input.now,
        })
    }

    static rehydrate(props: AiGenerationProps): AiGenerationAggregate {
        // `request` comes back from a jsonb column, which Postgres does not
        // shape-check. The invariant is re-asserted rather than trusted.
        assertRequestMatchesKind(props.kind, props.request)

        return new AiGenerationAggregate(props)
    }

    /**
     * A worker picked it up. Only from `queued`, which is what makes a duplicated
     * job harmless: the second one finds it running and drops it rather than
     * paying the provider twice for the same answer.
     */
    start(now: Date): void {
        if (!this.props.status.isQueued) throw new AiGenerationNotQueuedError()

        this.props.status = GenerationStatusVO.create('running')
        this.props.updatedAt = now
    }

    /** The model answered and the draft was written. */
    succeed(draftId: string, now: Date): void {
        this.requireUnsettled()

        this.props.status = GenerationStatusVO.create('succeeded')
        this.props.draftId = draftId
        this.props.updatedAt = now
    }

    /**
     * It did not produce a draft. `code` is the domain error's stable code — the
     * caller maps anything it cannot identify to `UNKNOWN` rather than passing a
     * message through.
     */
    fail(code: string, now: Date): void {
        this.requireUnsettled()
        if (!FAILURE_CODE.test(code)) {
            throw new InvalidAiGenerationRequestError(`"${code}" is not a failure code`)
        }

        this.props.status = GenerationStatusVO.create('failed')
        this.props.failureCode = code
        this.props.updatedAt = now
    }

    /**
     * What this generation occupies while it runs. One unsettled generation per
     * scope is the rule the persistence layer enforces, and it is what stops a
     * double-click — or a client retrying a mutation it thought had failed — from
     * spending the athlete's provider credit twice on the same answer.
     *
     * A refinement is scoped to the draft it revises; a first generation to what
     * it will produce a draft for.
     */
    get scopeKey(): string {
        const request = this.props.request

        if ('draftId' in request) return `draft:${request.draftId}`
        if ('sessionId' in request) return `session:${request.sessionId}`

        // A coach may have one block in flight per athlete, and one of their own.
        return `mesocycle:${request.athleteId ?? this.props.userId}`
    }

    get id(): string {
        return this.props.id
    }
    get userId(): string {
        return this.props.userId
    }
    get kind(): GenerationKindVO {
        return this.props.kind
    }
    get status(): GenerationStatusVO {
        return this.props.status
    }
    get request(): AiGenerationRequest {
        return this.props.request
    }
    get draftId(): string | null {
        return this.props.draftId
    }
    get failureCode(): string | null {
        return this.props.failureCode
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
    get updatedAt(): Date {
        return this.props.updatedAt
    }

    private requireUnsettled(): void {
        if (this.props.status.isSettled) throw new AiGenerationAlreadySettledError()
    }
}

/**
 * The request is the one its kind promises. Every field the worker will read is
 * checked here, because the alternative is discovering the row is unusable
 * halfway through a job that has already been paid for.
 */
function assertRequestMatchesKind(kind: GenerationKindVO, request: AiGenerationRequest): void {
    switch (kind.value) {
        case 'session_plan': {
            const it = request as SessionPlanRequest
            assertUuid(it.sessionId, 'sessionId')
            if (it.entryId !== null) assertUuid(it.entryId, 'entryId')

            return
        }
        case 'mesocycle': {
            const it = request as MesocycleRequest
            if (it.athleteId !== null) assertUuid(it.athleteId, 'athleteId')
            if (!Number.isInteger(it.weeks)) throw new InvalidAiGenerationRequestError('weeks is not a whole number')
            if (!Array.isArray(it.trainingDays) || it.trainingDays.length === 0) {
                throw new InvalidAiGenerationRequestError('no training days were asked for')
            }

            return
        }
        case 'session_plan_refinement':
        case 'mesocycle_refinement': {
            const it = request as RefinementRequest
            assertUuid(it.draftId, 'draftId')
            if (typeof it.message !== 'string' || it.message.trim() === '') {
                throw new InvalidAiGenerationRequestError('a refinement says nothing')
            }

            return
        }
    }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function assertUuid(value: unknown, field: string): void {
    if (typeof value !== 'string' || !UUID.test(value)) {
        throw new InvalidAiGenerationRequestError(`${field} is not an id`)
    }
}
