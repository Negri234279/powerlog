import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql'

import type { RosterAttention } from '../../application/queries/get-coach-roster/get-coach-roster.handler'

export const ROSTER_ATTENTION = {
    none: 'none',
    stale: 'stale',
    neverTrained: 'neverTrained',
    lowAdherence: 'lowAdherence',
} as const satisfies Record<RosterAttention, RosterAttention>

registerEnumType(ROSTER_ATTENTION, {
    name: 'RosterAttention',
    description: 'Why an athlete is flagged on the roster, or `none`. At most one reason per athlete.',
})

/**
 * One athlete's training rollups for their coach's roster. Identity (handle,
 * name, avatar) is **not** here: it belongs to coaching/profile, and the client
 * merges the two by `athleteId`. Weights are kg.
 *
 * `lastSessionAt` and `nextSessionAt` ignore the date range on purpose — a
 * future session can't fall inside a past window, and "last trained 40 days ago"
 * is exactly what a 30-day window would hide.
 */
@ObjectType('CoachRosterEntry')
export class CoachRosterEntryType {
    @Field(() => ID)
    athleteId!: string

    @Field(() => Date, { description: 'When the coaching relationship started.' })
    coachedSince!: Date

    @Field(() => Date, { nullable: true, description: 'All-time; null when they have never trained.' })
    lastSessionAt?: Date | null

    @Field(() => Int, { nullable: true })
    daysSinceLastSession?: number | null

    @Field(() => Date, { nullable: true, description: 'Next planned session, all-future.' })
    nextSessionAt?: Date | null

    @Field(() => Float, { nullable: true, description: "Completed ÷ due of this coach's programming." })
    adherenceRate?: number | null

    @Field(() => Int)
    plannedCompleted!: number

    @Field(() => Int)
    plannedMissed!: number

    @Field(() => Int, { description: 'Completed + missed — the adherence denominator.' })
    plannedDue!: number

    @Field(() => Int)
    completedSessions!: number

    @Field(() => Float, { nullable: true, description: 'Null (not 0) when nothing was trained in range.' })
    volumeKg?: number | null

    @Field(() => Float, { nullable: true, description: 'Signed change vs the preceding window.' })
    volumeChange?: number | null

    @Field(() => ROSTER_ATTENTION)
    attention!: RosterAttention
}
