import { Field, ID, Int, ObjectType } from '@nestjs/graphql'

/**
 * One line of the AI conversation history. Thin on purpose: the thread and the
 * proposal are fetched only when a conversation is opened.
 */
@ObjectType('AiDraftSummary')
export class AiDraftSummaryType {
    @Field(() => ID)
    id!: string

    @Field(() => String, { description: '"session" or "mesocycle".' })
    kind!: string

    @Field(() => String, { description: '"open", "accepted" or "discarded".' })
    status!: string

    @Field(() => String, { description: '"openai" or "anthropic".' })
    provider!: string

    @Field(() => String, { description: 'The model that produced the proposal.' })
    model!: string

    @Field(() => ID, { nullable: true, description: 'The session programmed; null on mesocycle drafts.' })
    sessionId!: string | null

    @Field(() => ID, {
        nullable: true,
        description: 'The athlete a coach designed for; null on session drafts and on the caller’s own blocks.',
    })
    athleteId!: string | null

    @Field(() => String, { nullable: true, description: 'The block name the model proposed; null on session drafts.' })
    name!: string | null

    @Field(() => ID, { nullable: true, description: 'The resolved draft this one continues, if any.' })
    parentDraftId!: string | null

    @Field(() => String, {
        nullable: true,
        description: 'What the athlete asked for, in their own words; null when the draft was generated unprompted.',
    })
    title!: string | null

    @Field(() => Int)
    messageCount!: number

    @Field(() => Date)
    createdAt!: Date

    @Field(() => Date)
    updatedAt!: Date
}

/** A keyset page of the history. `nextCursor` is opaque — pass it back verbatim. */
@ObjectType('AiDraftHistoryPage')
export class AiDraftHistoryPageType {
    @Field(() => [AiDraftSummaryType])
    items!: AiDraftSummaryType[]

    @Field(() => String, { nullable: true })
    nextCursor!: string | null

    @Field(() => Boolean)
    hasNextPage!: boolean
}
