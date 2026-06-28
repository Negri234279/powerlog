import { Field, Float, Int, ObjectType } from '@nestjs/graphql'

/** Headline training KPIs within the selected range. Weights are kg. */
@ObjectType('TrainingSummary')
export class TrainingSummaryType {
    @Field(() => Int)
    sessions!: number

    @Field(() => Int, { description: 'Distinct calendar days trained.' })
    trainingDays!: number

    @Field(() => Int)
    totalSets!: number

    @Field(() => Int)
    totalReps!: number

    @Field(() => Float, { description: 'Σ weight·reps (kg) over logged sets.' })
    totalVolumeKg!: number

    @Field(() => Float, { nullable: true, description: 'Mean RPE over sets that recorded one.' })
    avgRpe?: number | null

    @Field(() => Int)
    distinctExercises!: number

    @Field(() => Float, { nullable: true })
    bestSquatE1rmKg?: number | null

    @Field(() => Float, { nullable: true })
    bestBenchE1rmKg?: number | null

    @Field(() => Float, { nullable: true })
    bestDeadliftE1rmKg?: number | null

    @Field(() => Float, { nullable: true, description: 'Estimated S+B+D total (kg).' })
    estimatedTotalKg?: number | null
}

/** One week of training volume. */
@ObjectType('VolumeBucket')
export class VolumeBucketType {
    @Field({ description: 'Start of the week (UTC).' })
    bucketStart!: Date

    @Field(() => Float)
    totalVolumeKg!: number

    @Field(() => Int)
    totalSets!: number

    @Field(() => Int)
    sessions!: number
}

/** A single e1RM observation on a session date. */
@ObjectType('StrengthPoint')
export class StrengthPointType {
    @Field()
    performedAt!: Date

    @Field(() => Float)
    e1rmKg!: number
}

/** A projected e1RM `weeks` ahead of the last data point. */
@ObjectType('StrengthProjection')
export class StrengthProjectionType {
    @Field(() => Int)
    weeks!: number

    @Field(() => Float)
    e1rmKg!: number
}

/** Linear trend over the e1RM series plus forward projections. */
@ObjectType('StrengthTrend')
export class StrengthTrendType {
    @Field(() => Float, { description: 'kg gained per week (negative = regressing).' })
    slopePerWeekKg!: number

    @Field(() => Float, { description: 'Fit quality R² in [0, 1].' })
    r2!: number

    @Field(() => [StrengthProjectionType])
    projections!: StrengthProjectionType[]
}

/** e1RM progression for one exercise, with its trend (null when < 2 points). */
@ObjectType('StrengthProgression')
export class StrengthProgressionType {
    @Field(() => [StrengthPointType])
    points!: StrengthPointType[]

    @Field(() => StrengthTrendType, { nullable: true })
    trend?: StrengthTrendType | null
}

/** Volume + sets aggregated over a grouping key (muscle or category). */
@ObjectType('DistributionSlice')
export class DistributionSliceType {
    @Field(() => String)
    key!: string

    @Field(() => Float)
    totalVolumeKg!: number

    @Field(() => Int)
    totalSets!: number
}

/** Count of logged sets at an intensity value (rounded RPE, or integer RIR). */
@ObjectType('IntensityBucket')
export class IntensityBucketType {
    @Field(() => Int, { description: 'Rounded RPE (6–10) or RIR (0–50).' })
    value!: number

    @Field(() => Int)
    sets!: number
}

/** Muscle + movement distribution and the RPE/RIR intensity breakdowns. */
@ObjectType('TrainingDistribution')
export class TrainingDistributionType {
    @Field(() => [DistributionSliceType])
    byMuscle!: DistributionSliceType[]

    @Field(() => [DistributionSliceType])
    byCategory!: DistributionSliceType[]

    @Field(() => [IntensityBucketType])
    rpe!: IntensityBucketType[]

    @Field(() => [IntensityBucketType])
    rir!: IntensityBucketType[]
}
