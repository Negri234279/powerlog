import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql'

/** Per-exercise analytics: training volume + personal records. */
@ObjectType('ExerciseStats')
export class ExerciseStatsType {
    @Field(() => ID)
    exerciseId!: string

    @Field()
    slug!: string

    @Field()
    name!: string

    @Field(() => String)
    category!: string

    @Field(() => Float, { description: 'Σ weight·reps (kg) over logged sets.' })
    totalVolumeKg!: number

    @Field(() => Int)
    totalSets!: number

    @Field(() => Int)
    totalReps!: number

    @Field(() => Float, { nullable: true, description: 'Best estimated 1RM (kg).' })
    bestE1rmKg?: number | null

    @Field(() => Float, { nullable: true, description: 'Heaviest single set (kg).' })
    heaviestWeightKg?: number | null

    @Field(() => Int, { description: 'Sets marked successful. Unmarked sets count in neither.' })
    successSets!: number

    @Field(() => Int)
    failedSets!: number
}
