import { AiPlanDraftNotOpenError, ConflictingPlanIntensityError } from '../errors/ai-plan.errors'
import type { AiProviderVO } from '../value-objects/ai-provider.vo'
import { PlanDraftStatusVO } from '../value-objects/plan-draft-status.vo'
import { AiPlanMessageEntity, type PlanMessageRole } from './ai-plan-message.entity'

/**
 * A prescribed working set, addressed positionally within its exercise entry.
 * The model decides how many sets a day should have, so a draft can propose
 * more sets than the session currently holds — workouts creates the missing
 * ones when the draft is accepted.
 */
export interface PlanDraftSet {
    /** The exercise entry this set belongs to. */
    entryId: string
    /** 1-based position within the entry. */
    order: number
    plannedWeightKg: number | null
    plannedReps: number | null
    rpe: number | null
    rir: number | null
    /** The model's one-line reason for this set; null leaves the athlete's note. */
    notes: string | null
}

export interface AiPlanDraftProps {
    id: string
    userId: string
    /** The planned session this draft programs (soft reference). */
    sessionId: string
    /**
     * The single exercise entry this draft programs; null means the whole
     * session. A refinement must be asked with the same scope, or the model would
     * be handed sets the draft never proposed.
     */
    entryId: string | null
    provider: AiProviderVO
    model: string
    status: PlanDraftStatusVO
    sets: PlanDraftSet[]
    messages: AiPlanMessageEntity[]
    createdAt: Date
    updatedAt: Date
}

/**
 * `AiPlanDraftAggregate` — a proposal, not a fact. It holds the targets the
 * model suggested for a planned session plus the conversation that produced
 * them, and nothing about it reaches the session until the athlete accepts it.
 *
 * Aggregate root without domain events (nothing consumes them), so it does not
 * extend `AggregateRoot` — same call as `ProfileAggregate`.
 *
 * `accepted` and `discarded` are terminal: a resolved draft can no longer be
 * refined or re-accepted, which is what stops a double-click from writing the
 * plan twice.
 */
export class AiPlanDraftAggregate {
    private constructor(private readonly props: AiPlanDraftProps) {}

    static create(input: {
        id: string
        userId: string
        sessionId: string
        entryId?: string | null
        provider: AiProviderVO
        model: string
        sets: PlanDraftSet[]
        /** The model's rationale for this first proposal. */
        rationale: string
        rationaleId: string
        /** What the athlete told the model when asking for it, if anything. */
        request?: { id: string; content: string }
        now: Date
    }): AiPlanDraftAggregate {
        assertIntensityIsUnambiguous(input.sets)

        const request = input.request
            ? [
                  AiPlanMessageEntity.create({
                      id: input.request.id,
                      role: 'user' as const,
                      content: input.request.content,
                      createdAt: input.now,
                  }),
              ]
            : []

        return new AiPlanDraftAggregate({
            id: input.id,
            userId: input.userId,
            sessionId: input.sessionId,
            entryId: input.entryId ?? null,
            provider: input.provider,
            model: input.model,
            status: PlanDraftStatusVO.open(),
            sets: input.sets,
            // The athlete's request comes first, so the thread reads as the
            // conversation it was.
            messages: [
                ...request,
                AiPlanMessageEntity.create({
                    id: input.rationaleId,
                    role: 'assistant',
                    content: input.rationale,
                    createdAt: input.now,
                }),
            ],
            createdAt: input.now,
            updatedAt: input.now,
        })
    }

    static rehydrate(props: AiPlanDraftProps): AiPlanDraftAggregate {
        return new AiPlanDraftAggregate(props)
    }

    /** Record what the athlete asked for, before the model answers it. */
    addMessage(input: { id: string; role: PlanMessageRole; content: string }, now: Date): void {
        this.requireOpen()

        this.props.messages.push(AiPlanMessageEntity.create({ ...input, createdAt: now }))
        this.props.updatedAt = now
    }

    /** Replace the proposal with a revised one, and record its rationale. */
    revise(sets: PlanDraftSet[], input: { rationaleId: string; rationale: string }, now: Date): void {
        this.requireOpen()
        assertIntensityIsUnambiguous(sets)

        this.props.sets = sets
        this.props.messages.push(
            AiPlanMessageEntity.create({
                id: input.rationaleId,
                role: 'assistant',
                content: input.rationale,
                createdAt: now,
            }),
        )
        this.props.updatedAt = now
    }

    accept(now: Date): void {
        this.requireOpen()

        this.props.status = PlanDraftStatusVO.create('accepted')
        this.props.updatedAt = now
    }

    discard(now: Date): void {
        this.requireOpen()

        this.props.status = PlanDraftStatusVO.create('discarded')
        this.props.updatedAt = now
    }

    private requireOpen(): void {
        if (!this.props.status.isOpen) throw new AiPlanDraftNotOpenError()
    }

    get id(): string {
        return this.props.id
    }
    get userId(): string {
        return this.props.userId
    }
    get sessionId(): string {
        return this.props.sessionId
    }
    get entryId(): string | null {
        return this.props.entryId
    }
    get provider(): AiProviderVO {
        return this.props.provider
    }
    get model(): string {
        return this.props.model
    }
    get status(): PlanDraftStatusVO {
        return this.props.status
    }
    get sets(): readonly PlanDraftSet[] {
        return this.props.sets
    }
    get messages(): readonly AiPlanMessageEntity[] {
        return this.props.messages
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
    get updatedAt(): Date {
        return this.props.updatedAt
    }
}

/**
 * RPE and RIR are two ways of saying the same thing, and workouts rejects a set
 * that carries both. Catching it here means a bad model answer fails while it is
 * still a proposal, rather than at the moment the athlete accepts it.
 */
function assertIntensityIsUnambiguous(sets: readonly PlanDraftSet[]): void {
    if (sets.some((set) => set.rpe !== null && set.rir !== null)) {
        throw new ConflictingPlanIntensityError()
    }
}
