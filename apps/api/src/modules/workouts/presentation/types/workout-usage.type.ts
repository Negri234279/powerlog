import { Field, Int, ObjectType } from '@nestjs/graphql'

/** The caller's self-created counts, read against the plan's caps for a "used / limit" view. */
@ObjectType('WorkoutUsage')
export class WorkoutUsageType {
    @Field(() => Int)
    templates!: number

    @Field(() => Int)
    mesocycles!: number

    @Field(() => Int)
    workouts!: number
}
