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

/**
 * How someone is executing their training. Served to both a lifter reading their
 * own numbers (`trainingExecution`) and a coach reading an athlete's
 * (`athleteExecution`) — the same shape as `TrainingSummary` is.
 *
 * **The adherence scope differs by caller and the UI must say which it is.** For
 * a coach it counts only sessions *they* programmed, so it sits beside set
 * outcomes and load compliance that cover all the athlete's training — two
 * populations that must not be blurred. For a lifter's own view every planned
 * session counts, so all three cover the same thing and the distinction is moot.
 *
 * Every rate is a ratio (0.94 = 94%), nullable, and `null` means "no basis to
 * answer" — never zero.
 */
@ObjectType('TrainingExecution')
export class TrainingExecutionType {
    @Field(() => Float, { nullable: true, description: 'Completed ÷ due, within the adherence scope. Null when none.' })
    adherenceRate?: number | null

    @Field(() => Int)
    plannedCompleted!: number

    @Field(() => Int, { description: 'In scope, already past, still not done.' })
    plannedMissed!: number

    @Field(() => Int, { description: 'Still on the calendar. Not bounded by the range.' })
    plannedUpcoming!: number

    @Field(() => Float, { nullable: true, description: 'Successful ÷ marked sets, across all their training.' })
    successRate?: number | null

    @Field(() => Int)
    successSets!: number

    @Field(() => Int)
    failedSets!: number

    @Field(() => Int, { description: 'Logged in a completed session but never marked either way.' })
    pendingSets!: number

    @Field(() => Float, { nullable: true, description: 'Executed ÷ programmed load. Above 1 = heavier than written.' })
    loadCompliance?: number | null

    @Field(() => Int, { description: 'Sets the compliance ratio is built from.' })
    plannedSets!: number

    @Field(() => Float, { nullable: true })
    sessionsPerWeek?: number | null

    // Explicit type: a nullable union erases to Object under emitDecoratorMetadata,
    // and the schema builder can't infer Date from that.
    @Field(() => Date, { nullable: true, description: 'Last completed session, all-time (ignores the range).' })
    lastSessionAt?: Date | null

    @Field(() => Int, { nullable: true })
    daysSinceLastSession?: number | null

    @Field(() => Float, { nullable: true, description: 'Signed change vs the preceding window (0.12 = +12%).' })
    volumeChange?: number | null

    @Field(() => Float, { nullable: true })
    sessionsChange?: number | null
}

/**
 * One week of execution. Same scopes as `TrainingExecution`: adherence follows
 * the caller's planner scope, load covers every completed session with a plan.
 */
@ObjectType('ExecutionBucket')
export class ExecutionBucketType {
    @Field({ description: 'Start of the week (UTC).' })
    bucketStart!: Date

    @Field(() => Int)
    plannedCompleted!: number

    @Field(() => Int)
    plannedMissed!: number

    @Field(() => Float)
    plannedLoadKg!: number

    @Field(() => Float)
    actualLoadKg!: number
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
