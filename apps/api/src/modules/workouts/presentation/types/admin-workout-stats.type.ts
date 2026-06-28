import { Field, Int, ObjectType } from '@nestjs/graphql'

/** Aggregate training counts for the admin dashboard. */
@ObjectType('AdminWorkoutStats')
export class AdminWorkoutStatsType {
    @Field(() => Int)
    sessions!: number

    @Field(() => Int)
    completedSessions!: number

    @Field(() => Int)
    sets!: number

    @Field(() => Int)
    exercises!: number

    @Field(() => Int)
    sessionsLast7Days!: number

    @Field(() => Int)
    activeUsers!: number
}
