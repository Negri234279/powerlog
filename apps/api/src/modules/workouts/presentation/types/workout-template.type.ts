import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql'

/** A programmed set within a template exercise. Weights are kg. */
@ObjectType('WorkoutTemplateSet')
export class WorkoutTemplateSetType {
    @Field(() => ID)
    id!: string

    @Field(() => Int)
    order!: number

    @Field(() => Float, { nullable: true })
    plannedWeightKg?: number | null

    @Field(() => Int, { nullable: true })
    plannedReps?: number | null

    @Field(() => Float, { nullable: true })
    rpe?: number | null

    @Field(() => Int, { nullable: true })
    rir?: number | null

    @Field(() => String, { nullable: true })
    notes?: string | null
}

@ObjectType('WorkoutTemplateExercise')
export class WorkoutTemplateExerciseType {
    @Field(() => ID)
    id!: string

    @Field(() => ID)
    exerciseId!: string

    @Field(() => Int)
    order!: number

    @Field(() => String, { nullable: true })
    notes?: string | null

    @Field(() => [WorkoutTemplateSetType])
    sets!: WorkoutTemplateSetType[]
}

@ObjectType('WorkoutTemplate')
export class WorkoutTemplateType {
    @Field(() => ID)
    id!: string

    @Field(() => ID)
    ownerId!: string

    @Field()
    name!: string

    @Field(() => String, { nullable: true })
    notes?: string | null

    @Field()
    createdAt!: Date

    @Field()
    updatedAt!: Date

    @Field(() => [WorkoutTemplateExerciseType])
    exercises!: WorkoutTemplateExerciseType[]
}

/** A template list row: header + cheap rollups (no exercise/set tree). */
@ObjectType('WorkoutTemplateSummary')
export class WorkoutTemplateSummaryType {
    @Field(() => ID)
    id!: string

    @Field()
    name!: string

    @Field(() => String, { description: 'personal (own training) | coaching (for athletes)' })
    scope!: string

    @Field(() => String, { nullable: true })
    notes?: string | null

    @Field()
    updatedAt!: Date

    @Field(() => Int)
    exerciseCount!: number

    @Field(() => Int)
    setCount!: number
}
