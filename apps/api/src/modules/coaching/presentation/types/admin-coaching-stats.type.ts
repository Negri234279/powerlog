import { Field, Int, ObjectType } from '@nestjs/graphql'

/** Aggregate coaching counts for the admin dashboard. */
@ObjectType('AdminCoachingStats')
export class AdminCoachingStatsType {
    @Field(() => Int)
    links!: number

    @Field(() => Int)
    activeCoaches!: number

    @Field(() => Int)
    linkedAthletes!: number

    @Field(() => Int)
    pendingInvitations!: number
}
