import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql'

/** A proposed working set, positional within its exercise entry. Weights are kg. */
@ObjectType('AiPlanDraftSet')
export class AiPlanDraftSetType {
    @Field(() => ID, { description: 'The exercise entry this set belongs to.' })
    entryId!: string

    @Field(() => Int, { description: '1-based position within the entry.' })
    order!: number

    @Field(() => Float, { nullable: true })
    plannedWeightKg!: number | null

    @Field(() => Int, { nullable: true })
    plannedReps!: number | null

    @Field(() => Float, { nullable: true })
    rpe!: number | null

    @Field(() => Int, { nullable: true })
    rir!: number | null

    @Field(() => String, { nullable: true, description: 'The model’s one-line reason for this set.' })
    notes!: string | null
}

/** One turn of the conversation attached to the draft. */
@ObjectType('AiPlanDraftMessage')
export class AiPlanDraftMessageType {
    @Field(() => ID)
    id!: string

    @Field(() => String, { description: '"user" or "assistant".' })
    role!: string

    @Field(() => String)
    content!: string

    @Field(() => Date)
    createdAt!: Date
}

/**
 * A proposal for a planned session. Nothing here has touched the session: the
 * targets are written only when the draft is accepted.
 */
@ObjectType('AiPlanDraft')
export class AiPlanDraftType {
    @Field(() => ID)
    id!: string

    @Field(() => ID)
    sessionId!: string

    @Field(() => ID, { nullable: true, description: 'The single exercise programmed; null → the whole session.' })
    entryId!: string | null

    @Field(() => String, { description: '"openai" or "anthropic".' })
    provider!: string

    @Field(() => String, { description: 'The model that produced this proposal.' })
    model!: string

    @Field(() => String, { description: '"open", "accepted" or "discarded".' })
    status!: string

    @Field(() => [AiPlanDraftSetType])
    sets!: AiPlanDraftSetType[]

    @Field(() => [AiPlanDraftMessageType])
    messages!: AiPlanDraftMessageType[]

    @Field(() => Date)
    createdAt!: Date

    @Field(() => Date)
    updatedAt!: Date
}
