import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql'

/** A session header with cheap rollups, for the history list. Weights are kg. */
@ObjectType('WorkoutSessionSummary')
export class WorkoutSessionSummaryType {
    @Field(() => ID)
    id!: string

    @Field(() => ID)
    userId!: string

    @Field(() => String, { description: 'planned | completed' })
    status!: string

    @Field()
    performedAt!: Date

    @Field(() => String, { nullable: true })
    notes?: string | null

    @Field(() => ID, { nullable: true, description: 'Coach who planned this session, if any.' })
    plannedByUserId?: string | null

    @Field()
    createdAt!: Date

    @Field()
    updatedAt!: Date

    @Field(() => Int, { description: 'Number of exercise entries.' })
    exerciseCount!: number

    @Field(() => Int, { description: 'Number of sets across all entries.' })
    setCount!: number

    @Field(() => Float, { description: 'Σ weight·reps (kg) over logged sets.' })
    totalVolumeKg!: number
}

/** One keyset page of session summaries. */
@ObjectType('WorkoutHistoryPage')
export class WorkoutHistoryPageType {
    @Field(() => [WorkoutSessionSummaryType])
    items!: WorkoutSessionSummaryType[]

    @Field(() => String, { nullable: true, description: 'Cursor for the next page; null when last.' })
    nextCursor?: string | null

    @Field()
    hasNextPage!: boolean
}
