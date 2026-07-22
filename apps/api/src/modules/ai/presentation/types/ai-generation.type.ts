import { Field, ID, ObjectType } from '@nestjs/graphql'

/**
 * An AI job in flight. The generate and refine mutations return one of these
 * instead of a draft: the provider takes tens of seconds, so the mutation
 * answers with a receipt and the draft arrives later.
 *
 * The client watches it — pushed by SSE, polled as a fallback — and fetches the
 * draft by `draftId` once it succeeds.
 */
@ObjectType('AiGeneration')
export class AiGenerationType {
    @Field(() => ID)
    id!: string

    @Field(() => String, {
        description: '"session_plan", "session_plan_refinement", "mesocycle" or "mesocycle_refinement".',
    })
    kind!: string

    @Field(() => String, { description: '"queued", "running", "succeeded" or "failed".' })
    status!: string

    @Field(() => ID, { nullable: true, description: 'The draft it produced; null until it succeeds.' })
    draftId!: string | null

    @Field(() => String, {
        nullable: true,
        description: 'Why it failed, as a stable error code; null unless it failed.',
    })
    failureCode!: string | null

    @Field(() => Date)
    createdAt!: Date

    @Field(() => Date)
    updatedAt!: Date
}
