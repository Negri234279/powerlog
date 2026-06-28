import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql'

/** A set within an exercise entry. Weights are kg; enum-like fields are strings. */
@ObjectType('WorkoutSet')
export class WorkoutSetType {
    @Field(() => ID)
    id!: string

    @Field(() => Int)
    order!: number

    @Field(() => Float, { nullable: true })
    plannedWeightKg?: number | null

    @Field(() => Int, { nullable: true })
    plannedReps?: number | null

    @Field(() => Float, { nullable: true })
    weightKg?: number | null

    @Field(() => Int, { nullable: true })
    reps?: number | null

    @Field(() => Float, { nullable: true })
    rpe?: number | null

    @Field(() => Int, { nullable: true })
    rir?: number | null

    @Field(() => Float, { nullable: true, description: 'Estimated 1RM (kg) from the actual set (Epley).' })
    e1rmKg?: number | null

    @Field(() => String, { nullable: true })
    notes?: string | null
}

@ObjectType('ExerciseEntry')
export class ExerciseEntryType {
    @Field(() => ID)
    id!: string

    @Field(() => ID)
    exerciseId!: string

    @Field(() => Int)
    order!: number

    @Field(() => String, { nullable: true })
    notes?: string | null

    @Field(() => [WorkoutSetType])
    sets!: WorkoutSetType[]
}

@ObjectType('WorkoutSession')
export class WorkoutSessionType {
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

    @Field(() => [ExerciseEntryType])
    entries!: ExerciseEntryType[]
}
