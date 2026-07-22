import {
    AiDraftThreadExhaustedError,
    AiMesocycleDraftNotOpenError,
    InvalidMesocycleDraftProposalError,
} from '../errors/ai-mesocycle.errors'
import { assertIntensityIsUnambiguous } from '../plan-intensity'
import type { AiProviderVO } from '../value-objects/ai-provider.vo'
import { PlanDraftStatusVO } from '../value-objects/plan-draft-status.vo'
import { AiPlanMessageEntity, type PlanMessageRole } from './ai-plan-message.entity'

/**
 * Structural ceilings on a proposed week. They are invariants of the aggregate
 * *and* the bounds the response parser rejects a model answer against — one
 * source of truth, so a jailbroken answer and a corrupted row fail the same way.
 */
export const MESOCYCLE_DRAFT_LIMITS = {
    weeks: { min: 1, max: 52 },
    daysPerWeek: { min: 1, max: 7 },
    exercisesPerDay: { min: 1, max: 12 },
    setsPerExercise: { min: 1, max: 10 },
    /** Turns in the refinement thread: the athlete's requests and the model's answers. */
    messages: 20,
} as const

/** A programmed set of the template week. Targets only — nothing performed yet. */
export interface DraftMesocycleSet {
    /** 1-based position within the exercise. */
    order: number
    plannedWeightKg: number | null
    plannedReps: number | null
    rpe: number | null
    rir: number | null
    notes: string | null
}

/**
 * One exercise of a training day. `slug` and `name` are carried alongside the
 * `exerciseId` the parser resolved them to: the client renders them without a
 * second round-trip, and a draft stays readable if the catalog is ever renamed.
 */
export interface DraftMesocycleExercise {
    exerciseId: string
    slug: string
    name: string
    notes: string | null
    sets: DraftMesocycleSet[]
}

/** A training day, placed in the week by its 0–6 offset from the week start. */
export interface DraftMesocycleDay {
    dayOffset: number
    label: string | null
    exercises: DraftMesocycleExercise[]
}

/** What the model proposes: a name for the block, and the one week it designed. */
export interface MesocycleDraftProposal {
    name: string
    days: DraftMesocycleDay[]
}

export interface AiMesocycleDraftProps {
    id: string
    userId: string
    /**
     * Who will train the block. Null → the owner designed it for themselves; set →
     * a coach designed it for that athlete, off THEIR strength. Kept on the draft
     * so a proposal built for one athlete can never be seeded into another's block.
     */
    athleteId: string | null
    provider: AiProviderVO
    model: string
    status: PlanDraftStatusVO
    /** How many weeks the athlete asked for; the template is replicated to fill them. */
    weeks: number
    /** The 0–6 offsets the athlete asked to train on. The proposal must use exactly these. */
    trainingDays: number[]
    goal: string | null
    proposal: MesocycleDraftProposal
    messages: AiPlanMessageEntity[]
    /**
     * The resolved draft this one was forked from, if any. Provenance only — the
     * fork stands on its own, so nothing about it reads through the parent.
     */
    parentDraftId: string | null
    /**
     * The block this draft became. Null until it is taken into the builder and
     * actually created — accepting alone does not create anything, so the id is
     * only knowable later.
     */
    mesocycleId: string | null
    createdAt: Date
    updatedAt: Date
}

/**
 * `AiMesocycleDraftAggregate` — a proposed training block, not a fact. It holds
 * one **template week** the model designed plus the conversation that produced
 * it, and nothing about it reaches the workouts module until the athlete takes
 * it: the client seeds the mesocycle builder with it, replicates the week to
 * `weeks` microcycles, and creates the mesocycle through the ordinary
 * `createMesocycle` mutation.
 *
 * Aggregate root without domain events (nothing consumes them), so it does not
 * extend `AggregateRoot` — same call as `AiPlanDraftAggregate`.
 *
 * `accepted` and `discarded` are terminal, and a user has at most one open draft
 * at a time (enforced by a partial unique index).
 */
export class AiMesocycleDraftAggregate {
    private constructor(private readonly props: AiMesocycleDraftProps) {}

    static create(input: {
        id: string
        userId: string
        /** Set when a coach designs for one of their athletes. */
        athleteId?: string | null
        provider: AiProviderVO
        model: string
        weeks: number
        trainingDays: number[]
        goal?: string | null
        proposal: MesocycleDraftProposal
        /** The model's rationale for this first proposal. */
        rationale: string
        rationaleId: string
        /** The athlete's free-text request, if they wrote one. */
        request?: { id: string; content: string } | null
        /** Set when this draft continues a resolved one. */
        parentDraftId?: string | null
        now: Date
    }): AiMesocycleDraftAggregate {
        assertWeeksInRange(input.weeks)
        assertProposalIsUsable(input.proposal, input.trainingDays)

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

        return new AiMesocycleDraftAggregate({
            id: input.id,
            userId: input.userId,
            athleteId: input.athleteId ?? null,
            provider: input.provider,
            model: input.model,
            status: PlanDraftStatusVO.open(),
            weeks: input.weeks,
            trainingDays: input.trainingDays,
            goal: input.goal ?? null,
            proposal: input.proposal,
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
            parentDraftId: input.parentDraftId ?? null,
            mesocycleId: null,
            createdAt: input.now,
            updatedAt: input.now,
        })
    }

    /**
     * Continue a conversation that was already resolved. The proposed week and the
     * athlete's structured request (weeks, training days, goal) are carried over,
     * and the model's reasoning behind the week opens the new thread — but the
     * thread starts fresh rather than being copied. That is deliberate: threads are
     * capped at `MESOCYCLE_DRAFT_LIMITS.messages`, so copying a long conversation
     * would hand the athlete a fork with no room left to say anything.
     */
    static fork(input: {
        id: string
        source: AiMesocycleDraftAggregate
        /** The caller's current provider — a fork may well run on a different model. */
        provider: AiProviderVO
        model: string
        rationaleId: string
        now: Date
    }): AiMesocycleDraftAggregate {
        const source = input.source

        return AiMesocycleDraftAggregate.create({
            id: input.id,
            userId: source.userId,
            athleteId: source.athleteId,
            provider: input.provider,
            model: input.model,
            weeks: source.weeks,
            trainingDays: [...source.trainingDays],
            goal: source.goal,
            proposal: source.proposal,
            rationale: source.lastRationale,
            rationaleId: input.rationaleId,
            parentDraftId: source.id,
            now: input.now,
        })
    }

    /**
     * The model's reasoning behind the current week — the last thing it said.
     * Every draft is born with one, so there is always an answer.
     */
    private get lastRationale(): string {
        const assistant = [...this.props.messages].reverse().find((message) => message.role === 'assistant')

        return assistant?.content ?? ''
    }

    static rehydrate(props: AiMesocycleDraftProps): AiMesocycleDraftAggregate {
        // `proposal` comes back from a jsonb column, which Postgres does not
        // shape-check. The invariants are re-asserted rather than trusted.
        assertProposalIsUsable(props.proposal, props.trainingDays)

        return new AiMesocycleDraftAggregate(props)
    }

    /**
     * Can this draft take another round of refinement? Asked before the model is
     * called, so a spent thread costs the athlete nothing: a refinement adds two
     * turns, their request and the model's answer.
     */
    requireRefinable(): void {
        this.requireOpen()
        if (this.props.messages.length + 2 > MESOCYCLE_DRAFT_LIMITS.messages) throw new AiDraftThreadExhaustedError()
    }

    /** Record what the athlete asked for, before the model answers it. */
    addMessage(input: { id: string; role: PlanMessageRole; content: string }, now: Date): void {
        this.requireOpen()
        if (this.props.messages.length >= MESOCYCLE_DRAFT_LIMITS.messages) throw new AiDraftThreadExhaustedError()

        this.props.messages.push(AiPlanMessageEntity.create({ ...input, createdAt: now }))
        this.props.updatedAt = now
    }

    /**
     * Replace the proposal with a revised one, and record its rationale. A
     * revision may rewrite the training entirely, but not the week's shape: the
     * days were the athlete's structured request, not the model's suggestion.
     */
    revise(proposal: MesocycleDraftProposal, input: { rationaleId: string; rationale: string }, now: Date): void {
        this.requireOpen()
        assertProposalIsUsable(proposal, this.props.trainingDays)

        this.props.proposal = proposal
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

    /**
     * The athlete took the proposal into the builder. Nothing is written to the
     * workouts module here — the draft is simply resolved, which frees the one
     * open slot so the next generation starts from a clean thread.
     */
    accept(now: Date): void {
        this.requireOpen()

        this.props.status = PlanDraftStatusVO.create('accepted')
        this.props.updatedAt = now
    }

    /**
     * Record the block this draft became. Write-once and status-agnostic: the
     * builder may create the block before or after the draft is accepted, and a
     * second creation from the same draft must not rewrite history.
     */
    linkMesocycle(mesocycleId: string, now: Date): void {
        if (this.props.mesocycleId !== null) return

        this.props.mesocycleId = mesocycleId
        this.props.updatedAt = now
    }

    discard(now: Date): void {
        this.requireOpen()

        this.props.status = PlanDraftStatusVO.create('discarded')
        this.props.updatedAt = now
    }

    private requireOpen(): void {
        if (!this.props.status.isOpen) throw new AiMesocycleDraftNotOpenError()
    }

    get id(): string {
        return this.props.id
    }
    get userId(): string {
        return this.props.userId
    }

    /** The athlete the block was designed for, or null when it is the owner's own. */
    get athleteId(): string | null {
        return this.props.athleteId
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
    get weeks(): number {
        return this.props.weeks
    }
    get trainingDays(): readonly number[] {
        return this.props.trainingDays
    }
    get goal(): string | null {
        return this.props.goal
    }
    get proposal(): MesocycleDraftProposal {
        return this.props.proposal
    }
    get messages(): readonly AiPlanMessageEntity[] {
        return this.props.messages
    }
    get parentDraftId(): string | null {
        return this.props.parentDraftId
    }
    get mesocycleId(): string | null {
        return this.props.mesocycleId
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
    get updatedAt(): Date {
        return this.props.updatedAt
    }
}

function assertWeeksInRange(weeks: number): void {
    const { min, max } = MESOCYCLE_DRAFT_LIMITS.weeks
    if (!Number.isInteger(weeks) || weeks < min || weeks > max) {
        throw new InvalidMesocycleDraftProposalError(`a block runs for ${min}–${max} weeks, not ${weeks}`)
    }
}

/**
 * A proposal is a training week or it is nothing. Every bound here is one the
 * model cannot talk its way past: a day the athlete did not ask to train, a day
 * programmed twice, an exercise with no sets, a set claiming both an RPE and an
 * RIR. What survives is a structure the mesocycle builder can render.
 *
 * The week trains exactly `trainingDays` — no more, no fewer. Those offsets came
 * from a structured, zod-validated field, never from the free-text prompt, so
 * text smuggled into the prompt cannot reshape the block it is asked to design.
 */
function assertProposalIsUsable(proposal: MesocycleDraftProposal, trainingDays: readonly number[]): void {
    const { daysPerWeek, exercisesPerDay, setsPerExercise } = MESOCYCLE_DRAFT_LIMITS

    if (proposal.name.trim() === '') throw new InvalidMesocycleDraftProposalError('it has no name')
    assertCount(proposal.days.length, daysPerWeek, 'training days in the week')

    const requested = new Set(trainingDays)
    const seen = new Set<number>()
    for (const day of proposal.days) {
        if (!requested.has(day.dayOffset)) {
            throw new InvalidMesocycleDraftProposalError(`day ${day.dayOffset} is not one of the days asked for`)
        }
        if (seen.has(day.dayOffset)) {
            throw new InvalidMesocycleDraftProposalError(`day ${day.dayOffset} is programmed twice`)
        }
        seen.add(day.dayOffset)

        assertCount(day.exercises.length, exercisesPerDay, `exercises on day ${day.dayOffset}`)
        for (const exercise of day.exercises) {
            assertCount(exercise.sets.length, setsPerExercise, `sets of "${exercise.slug}"`)
        }
    }

    const unprogrammed = trainingDays.filter((dayOffset) => !seen.has(dayOffset))
    if (unprogrammed.length > 0) {
        throw new InvalidMesocycleDraftProposalError(`${unprogrammed.length} of the requested days were left empty`)
    }

    assertIntensityIsUnambiguous(proposal.days.flatMap((day) => day.exercises.flatMap((exercise) => exercise.sets)))
}

function assertCount(count: number, bounds: { min: number; max: number }, what: string): void {
    if (count < bounds.min || count > bounds.max) {
        throw new InvalidMesocycleDraftProposalError(`${what}: expected ${bounds.min}–${bounds.max}, got ${count}`)
    }
}
