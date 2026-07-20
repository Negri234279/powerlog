import { Field, ID, Int, ObjectType } from '@nestjs/graphql'

import { JsonValue } from '../../../../graphql/json.scalar'

/** A plan's name/description in one non-default locale, as the admin form edits it. */
@ObjectType('PlanTranslation')
export class PlanTranslationType {
    @Field(() => String, { description: 'BCP-47 base locale, e.g. "es".' })
    locale!: string

    @Field(() => String)
    name!: string

    @Field(() => String, { nullable: true })
    description!: string | null
}

/** A price version of a plan. Amounts are integer cents. */
@ObjectType('PlanPrice')
export class PlanPriceType {
    @Field(() => ID)
    id!: string

    @Field(() => String, { description: 'month | quarter | semester | year' })
    interval!: string

    @Field(() => String, { description: 'EUR | USD' })
    currency!: string

    @Field(() => Int)
    amountCents!: number

    @Field(() => Boolean, {
        description: 'Whether it is on sale. Withdrawn versions stay: subscriptions point at them.',
    })
    active!: boolean

    @Field(() => String, { nullable: true, description: 'Set once the catalog is synced to Stripe.' })
    stripePriceId!: string | null

    @Field(() => String, { nullable: true, description: 'Set once the catalog is synced to PayPal.' })
    paypalPlanId!: string | null
}

/** What a subscriber of the plan effectively gets, once collapsed. */
@ObjectType('PlanEntitlements')
export class PlanEntitlementsType {
    @Field(() => String)
    plan!: string

    @Field(() => String)
    audience!: string

    @Field(() => Int, { nullable: true, description: 'How many templates they may create. null = unlimited.' })
    maxTemplates!: number | null

    @Field(() => Int, { nullable: true, description: 'How many mesocycles they may create. null = unlimited.' })
    maxMesocycles!: number | null

    @Field(() => Int, { nullable: true, description: 'How many workouts they may log. null = unlimited.' })
    maxWorkouts!: number | null

    @Field(() => Boolean)
    ai!: boolean

    @Field(() => Boolean)
    planSessions!: boolean

    @Field(() => Int, { nullable: true, description: 'null = unlimited.' })
    maxAthletes!: number | null
}

/** A discounted opening phase, in cycles and percent. */
@ObjectType('IntroPhase')
export class IntroPhaseType {
    @Field(() => Int)
    cycles!: number

    @Field(() => Int)
    percentOff!: number
}

/** The plan's live introductory offer. Applies to new signups only. */
@ObjectType('PlanOffer')
export class PlanOfferType {
    @Field(() => ID)
    id!: string

    @Field(() => String)
    name!: string

    @Field(() => String, { nullable: true, description: 'Buyer-facing promo copy for the pricing card.' })
    message!: string | null

    @Field(() => Int, { nullable: true, description: 'Free days before the first charge.' })
    trialDays!: number | null

    @Field(() => IntroPhaseType, { nullable: true })
    introPhase!: IntroPhaseType | null

    @Field(() => Date)
    startsAt!: Date

    @Field(() => Date, { nullable: true, description: 'Null = open-ended.' })
    endsAt!: Date | null

    @Field(() => String, { nullable: true, description: 'The Stripe coupon behind the intro phase.' })
    stripeCouponId!: string | null
}

@ObjectType('AdminPlan')
export class AdminPlanType {
    @Field(() => ID)
    id!: string

    @Field(() => String, { description: 'athlete | coach' })
    audience!: string

    @Field(() => String, { description: 'Stable public identifier. Immutable — it labels metrics.' })
    slug!: string

    @Field(() => String)
    name!: string

    @Field(() => String, { nullable: true })
    description!: string | null

    @Field(() => String, { description: 'draft | active | archived' })
    status!: string

    @Field(() => Boolean, { description: 'The fallback of its audience: no subscription row, no charge.' })
    isFree!: boolean

    @Field(() => Int)
    sortOrder!: number

    @Field(() => Boolean, { description: 'Editorial "recommended / most popular" badge for the pricing card.' })
    highlighted!: boolean

    @Field(() => JsonValue, {
        description: 'The raw entitlements the admin form edits. Its shape is the zod schema of the audience.',
    })
    entitlements!: unknown

    @Field(() => PlanEntitlementsType, {
        description: 'The same entitlements, collapsed as a subscriber would get them.',
    })
    snapshot!: unknown

    @Field(() => [PlanPriceType])
    prices!: PlanPriceType[]

    @Field(() => PlanOfferType, { nullable: true, description: 'The plan’s live offer, if it has one.' })
    offer!: PlanOfferType | null

    @Field(() => [PlanTranslationType], { description: 'Localized name/description per non-default locale.' })
    translations!: PlanTranslationType[]

    @Field(() => String, {
        nullable: true,
        description: 'The Stripe Product this plan was published as. Null → never synced there.',
    })
    stripeProductId!: string | null

    @Field(() => String, {
        nullable: true,
        description: 'The PayPal Product this plan was published as. Null → never synced there.',
    })
    paypalProductId!: string | null

    @Field(() => Date)
    createdAt!: Date

    @Field(() => Date)
    updatedAt!: Date
}
