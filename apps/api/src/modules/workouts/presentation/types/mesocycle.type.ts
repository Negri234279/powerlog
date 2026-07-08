import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql'

/** A programmed set within a microcycle day exercise. Weights are kg. */
@ObjectType('MesocycleDaySet')
export class MesocycleDaySetType {
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

@ObjectType('MesocycleDayExercise')
export class MesocycleDayExerciseType {
    @Field(() => ID)
    id!: string

    @Field(() => ID)
    exerciseId!: string

    @Field(() => Int)
    order!: number

    @Field(() => String, { nullable: true })
    notes?: string | null

    @Field(() => [MesocycleDaySetType])
    sets!: MesocycleDaySetType[]
}

@ObjectType('MicrocycleDay')
export class MicrocycleDayType {
    @Field(() => ID)
    id!: string

    @Field(() => Int)
    order!: number

    @Field(() => Int, { description: '0–6 offset from the week start.' })
    dayOffset!: number

    @Field(() => String, { nullable: true })
    label?: string | null

    @Field(() => String, { nullable: true })
    notes?: string | null

    @Field(() => [MesocycleDayExerciseType])
    exercises!: MesocycleDayExerciseType[]
}

@ObjectType('Microcycle')
export class MicrocycleType {
    @Field(() => ID)
    id!: string

    @Field(() => Int, { description: '1-based week position within the mesocycle.' })
    weekIndex!: number

    @Field(() => String, { nullable: true })
    label?: string | null

    @Field(() => String, { nullable: true })
    notes?: string | null

    @Field(() => [MicrocycleDayType])
    days!: MicrocycleDayType[]
}

@ObjectType('Mesocycle')
export class MesocycleType {
    @Field(() => ID)
    id!: string

    @Field(() => ID)
    ownerId!: string

    @Field()
    name!: string

    @Field(() => String, { nullable: true })
    notes?: string | null

    @Field(() => String, { nullable: true })
    goal?: string | null

    @Field(() => Date, { nullable: true, description: 'Anchor date of week 1 (unscheduled if null).' })
    startDate?: Date | null

    @Field(() => String, { description: 'draft | active | completed | archived' })
    status!: string

    @Field()
    createdAt!: Date

    @Field()
    updatedAt!: Date

    @Field(() => [MicrocycleType])
    microcycles!: MicrocycleType[]

    @Field(() => [Int], { description: '1-based weeks already generated into sessions.' })
    generatedWeeks!: number[]
}

/** A mesocycle list row: header + cheap rollups (no week/day tree). */
@ObjectType('MesocycleSummary')
export class MesocycleSummaryType {
    @Field(() => ID)
    id!: string

    @Field()
    name!: string

    @Field(() => String, { nullable: true })
    notes?: string | null

    @Field(() => String, { nullable: true })
    goal?: string | null

    @Field(() => String, { description: 'draft | active | completed | archived' })
    status!: string

    @Field(() => Date, { nullable: true })
    startDate?: Date | null

    @Field()
    updatedAt!: Date

    @Field(() => Int)
    weekCount!: number

    @Field(() => Int)
    dayCount!: number
}
