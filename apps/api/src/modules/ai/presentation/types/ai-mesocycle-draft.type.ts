import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql'

/** A programmed set of the proposed week. Targets only. Weights are kg. */
@ObjectType('AiMesocycleDraftSet')
export class AiMesocycleDraftSetType {
    @Field(() => Int, { description: '1-based position within the exercise.' })
    order!: number

    @Field(() => Float, { nullable: true, description: 'Null where the athlete has no history to anchor a load on.' })
    plannedWeightKg!: number | null

    @Field(() => Int, { nullable: true })
    plannedReps!: number | null

    @Field(() => Float, { nullable: true })
    rpe!: number | null

    @Field(() => Int, { nullable: true })
    rir!: number | null

    @Field(() => String, { nullable: true, description: 'The model’s one-line reason for this set.' })
    notes!: string | null
}

/** One exercise of a training day, already resolved against the catalog. */
@ObjectType('AiMesocycleDraftExercise')
export class AiMesocycleDraftExerciseType {
    @Field(() => ID, { description: 'The catalog exercise this resolved to.' })
    exerciseId!: string

    @Field(() => String)
    slug!: string

    @Field(() => String, { description: 'The exercise’s canonical (English) name.' })
    name!: string

    @Field(() => String, { nullable: true })
    notes!: string | null

    @Field(() => [AiMesocycleDraftSetType])
    sets!: AiMesocycleDraftSetType[]
}

@ObjectType('AiMesocycleDraftDay')
export class AiMesocycleDraftDayType {
    @Field(() => Int, { description: '0–6 offset from the week start.' })
    dayOffset!: number

    @Field(() => String, { nullable: true })
    label!: string | null

    @Field(() => [AiMesocycleDraftExerciseType])
    exercises!: AiMesocycleDraftExerciseType[]
}

/** One expanded week of the block, ready to render — no client-side replication. */
@ObjectType('AiMesocycleDraftMicrocycle')
export class AiMesocycleDraftMicrocycleType {
    @Field(() => Int, { description: '0-based position in the block.' })
    index!: number

    @Field(() => Boolean)
    isDeload!: boolean

    @Field(() => [AiMesocycleDraftDayType])
    days!: AiMesocycleDraftDayType[]
}

/** How the block advances week to week; already applied to the microcycles. */
@ObjectType('AiMesocycleDraftProgression')
export class AiMesocycleDraftProgressionType {
    @Field(() => String, { description: '"linear_percent", "double_progression" or "rpe_ramp".' })
    model!: string

    @Field(() => Float, { description: '% the load climbs each non-deload week.' })
    weeklyIntensityStepPct!: number

    @Field(() => Int, { description: 'Sets added each non-deload week to the main lifts.' })
    weeklySetIncrement!: number

    @Field(() => [Int], { description: '0-based week indices that are deloads.' })
    deloadWeeks!: number[]

    @Field(() => Float, { description: 'Volume multiplier on a deload week.' })
    deloadFactor!: number
}

/** One turn of the conversation attached to the draft. */
@ObjectType('AiMesocycleDraftMessage')
export class AiMesocycleDraftMessageType {
    @Field(() => ID)
    id!: string

    @Field(() => String, { description: '"user" or "assistant".' })
    role!: string

    @Field(() => String)
    content!: string

    @Field(() => Date)
    createdAt!: Date
}

/**
 * A proposed training block: one template week, plus how many weeks to repeat it
 * into. Nothing here is a mesocycle yet — the client seeds the builder with it,
 * the athlete edits it, and `createMesocycle` is what writes anything down.
 */
@ObjectType('AiMesocycleDraft')
export class AiMesocycleDraftType {
    @Field(() => ID)
    id!: string

    @Field(() => ID, {
        nullable: true,
        description: 'The athlete it was designed for; null → your own block.',
    })
    athleteId!: string | null

    @Field(() => String, { description: '"openai" or "anthropic".' })
    provider!: string

    @Field(() => String, { description: 'The model that produced this proposal.' })
    model!: string

    @Field(() => String, { description: '"open", "accepted" or "discarded".' })
    status!: string

    @Field(() => Int, { description: 'Weeks the template is repeated into.' })
    weeks!: number

    @Field(() => [Int], { description: 'The 0–6 day offsets the athlete asked to train on.' })
    trainingDays!: number[]

    @Field(() => String, { nullable: true })
    goal!: string | null

    @Field(() => String, { description: 'The name the model proposed for the block.' })
    name!: string

    @Field(() => [AiMesocycleDraftDayType], { description: 'The template week (= microcycles[0].days).' })
    days!: AiMesocycleDraftDayType[]

    @Field(() => AiMesocycleDraftProgressionType, { description: 'How the block progresses week to week.' })
    progression!: AiMesocycleDraftProgressionType

    @Field(() => [AiMesocycleDraftMicrocycleType], { description: 'The expanded block, one entry per week.' })
    microcycles!: AiMesocycleDraftMicrocycleType[]

    @Field(() => [AiMesocycleDraftMessageType])
    messages!: AiMesocycleDraftMessageType[]

    @Field(() => ID, { nullable: true, description: 'The resolved draft this one continues, if any.' })
    parentDraftId!: string | null

    @Field(() => ID, { nullable: true, description: 'The block this draft became, once it was created.' })
    mesocycleId!: string | null

    @Field(() => Date)
    createdAt!: Date

    @Field(() => Date)
    updatedAt!: Date
}
