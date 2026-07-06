import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql'

/** A performed set from a past session. Weights are kg; intensity fields nullable. */
@ObjectType('ExerciseHistorySet')
export class ExerciseHistorySetType {
    @Field(() => Float)
    weightKg!: number

    @Field(() => Int)
    reps!: number

    @Field(() => Float, { nullable: true })
    rpe?: number | null

    @Field(() => Int, { nullable: true })
    rir?: number | null

    @Field(() => Float, { nullable: true, description: 'Estimated 1RM (kg) from the set (Epley).' })
    e1rmKg?: number | null
}

/** One past completed session that logged the exercise, with its performed sets. */
@ObjectType('ExerciseSessionHistory')
export class ExerciseSessionHistoryType {
    @Field(() => ID)
    sessionId!: string

    @Field()
    performedAt!: Date

    @Field(() => String, { description: 'planned | completed' })
    status!: string

    @Field(() => [ExerciseHistorySetType])
    sets!: ExerciseHistorySetType[]
}
