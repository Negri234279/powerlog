import { Field, ID, Int, ObjectType } from '@nestjs/graphql'

/** Auth-owned account fields — a superset of the list row. */
@ObjectType('AdminUserAccount')
export class AdminUserAccountType {
    @Field(() => ID)
    id!: string

    @Field()
    email!: string

    @Field({ description: '"athlete" | "coach".' })
    role!: string

    @Field()
    isAdmin!: boolean

    @Field({ description: '"active" | "disabled" | "deleted".' })
    status!: string

    @Field()
    emailVerified!: boolean

    @Field({ description: 'false → a Google-only account with no password.' })
    hasPassword!: boolean

    @Field({ description: 'Unit preference: "kg" | "lb".' })
    units!: string

    @Field()
    createdAt!: Date

    @Field()
    updatedAt!: Date
}

/** The public profile, or null if the user has no profile yet. */
@ObjectType('AdminUserProfile')
export class AdminUserProfileType {
    @Field()
    username!: string

    @Field(() => String, { nullable: true })
    firstName!: string | null

    @Field(() => String, { nullable: true })
    lastName!: string | null

    @Field(() => String, { nullable: true })
    avatarUrl!: string | null

    @Field(() => String, { nullable: true, description: 'Preferred locale (BCP-47), or null if unset.' })
    locale!: string | null
}

/** What the user's athlete plan grants (their own training). null caps = unlimited. */
@ObjectType('AdminAthleteEntitlements')
export class AdminAthleteEntitlementsType {
    @Field({ description: 'Slug of the plan this section came from.' })
    plan!: string

    @Field(() => Int, { nullable: true })
    maxTemplates!: number | null

    @Field(() => Int, { nullable: true })
    maxMesocycles!: number | null

    @Field(() => Int, { nullable: true })
    maxWorkouts!: number | null

    @Field()
    ai!: boolean
}

/** What the user's coach plan grants (material built for athletes). */
@ObjectType('AdminCoachEntitlements')
export class AdminCoachEntitlementsType {
    @Field({ description: 'Slug of the plan this section came from.' })
    plan!: string

    @Field(() => Int, { nullable: true })
    maxAthletes!: number | null

    @Field()
    planSessions!: boolean

    @Field(() => Int, { nullable: true })
    maxTemplates!: number | null

    @Field(() => Int, { nullable: true })
    maxMesocycles!: number | null

    @Field()
    ai!: boolean
}

/** The user's effective entitlements: one section per audience. */
@ObjectType('AdminUserEntitlements')
export class AdminUserEntitlementsType {
    @Field(() => AdminAthleteEntitlementsType)
    athlete!: AdminAthleteEntitlementsType

    @Field(() => AdminCoachEntitlementsType, { nullable: true, description: 'null when the user does no coaching.' })
    coach!: AdminCoachEntitlementsType | null
}

/** One of the user's subscriptions (active or historical). */
@ObjectType('AdminUserSubscription')
export class AdminUserSubscriptionType {
    @Field(() => ID)
    id!: string

    @Field(() => ID)
    planId!: string

    @Field()
    planSlug!: string

    @Field()
    planName!: string

    @Field({ description: 'stripe | paypal | manual.' })
    gateway!: string

    @Field()
    status!: string

    @Field(() => Int, { nullable: true, description: 'Null for a manual grant: nothing is charged.' })
    amountCents!: number | null

    @Field(() => String, { nullable: true })
    currency!: string | null

    @Field(() => String, { nullable: true })
    interval!: string | null

    @Field()
    currentPeriodStart!: Date

    @Field()
    currentPeriodEnd!: Date

    @Field()
    cancelAtPeriodEnd!: boolean

    @Field()
    createdAt!: Date
}

/** The user's subscriptions and the recurring revenue they represent. */
@ObjectType('AdminUserBilling')
export class AdminUserBillingType {
    @Field(() => [AdminUserSubscriptionType])
    subscriptions!: AdminUserSubscriptionType[]

    @Field(() => Int, { description: 'Monthly-normalised revenue from entitling, priced subscriptions.' })
    mrrCents!: number

    @Field(() => String, { nullable: true, description: 'Currency of the MRR figure; null when nothing is charged.' })
    currency!: string | null
}

/** A linked user (coach or athlete) resolved to their public card. */
@ObjectType('AdminCoachingUserCard')
export class AdminCoachingUserCardType {
    @Field(() => ID)
    userId!: string

    @Field()
    username!: string

    @Field(() => String, { nullable: true })
    firstName!: string | null

    @Field(() => String, { nullable: true })
    lastName!: string | null

    @Field(() => String, { nullable: true })
    avatarUrl!: string | null
}

/** The user's coaching relationships in both directions. */
@ObjectType('AdminUserCoaching')
export class AdminUserCoachingType {
    @Field(() => [AdminCoachingUserCardType], { description: 'Coaches over this user (usually zero or one).' })
    coaches!: AdminCoachingUserCardType[]

    @Field(() => Int, { description: 'How many athletes this user coaches (the true total).' })
    athleteCount!: number

    @Field(() => [AdminCoachingUserCardType], { description: 'A bounded sample of those athletes (newest first).' })
    athletes!: AdminCoachingUserCardType[]
}

/** The user's training activity. */
@ObjectType('AdminUserTraining')
export class AdminUserTrainingType {
    @Field(() => Int)
    sessions!: number

    @Field(() => Int)
    completedSessions!: number

    @Field(() => Int)
    sets!: number

    @Field(() => Int)
    distinctExercises!: number

    @Field(() => Date, { nullable: true, description: 'When the user last trained, or null if never.' })
    lastSessionAt!: Date | null

    @Field(() => Int)
    sessionsLast30Days!: number
}

/**
 * The full admin detail of one user. Only `account` is guaranteed; every other
 * section is null when its module couldn't answer, so the page degrades one card
 * at a time instead of failing whole.
 */
@ObjectType('AdminUserDetail')
export class AdminUserDetailType {
    @Field(() => AdminUserAccountType)
    account!: AdminUserAccountType

    @Field(() => AdminUserProfileType, { nullable: true })
    profile!: AdminUserProfileType | null

    @Field(() => AdminUserEntitlementsType, { nullable: true })
    entitlements!: AdminUserEntitlementsType | null

    @Field(() => AdminUserBillingType, { nullable: true })
    billing!: AdminUserBillingType | null

    @Field(() => AdminUserCoachingType, { nullable: true })
    coaching!: AdminUserCoachingType | null

    @Field(() => AdminUserTrainingType, { nullable: true })
    training!: AdminUserTrainingType | null
}
