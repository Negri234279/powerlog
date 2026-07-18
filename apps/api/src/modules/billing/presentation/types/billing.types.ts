import { Field, ID, Int, ObjectType } from '@nestjs/graphql'

import { IntroPhaseType } from './admin-plan.type'

/** A price of a plan, as a buyer sees it. */
@ObjectType('PublicPrice')
export class PublicPriceType {
    @Field(() => ID)
    id!: string

    @Field(() => String)
    interval!: string

    @Field(() => String)
    currency!: string

    @Field(() => Int)
    amountCents!: number

    @Field(() => [String], {
        description: 'The gateways that can sell this price right now. Empty → no checkout available.',
    })
    gateways!: string[]
}

@ObjectType('PublicOffer')
export class PublicOfferType {
    @Field(() => ID)
    id!: string

    @Field(() => String)
    name!: string

    @Field(() => Int, { nullable: true })
    trialDays!: number | null

    @Field(() => IntroPhaseType, { nullable: true })
    introPhase!: IntroPhaseType | null

    @Field(() => Date, { nullable: true })
    endsAt!: Date | null
}

/** A plan on the pricing page: what it includes and what it costs. */
@ObjectType('PublicPlan')
export class PublicPlanType {
    @Field(() => ID)
    id!: string

    @Field(() => String)
    slug!: string

    @Field(() => String)
    name!: string

    @Field(() => String, { nullable: true })
    description!: string | null

    @Field(() => Boolean)
    isFree!: boolean

    @Field(() => Int)
    sortOrder!: number

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

    @Field(() => [PublicPriceType])
    prices!: PublicPriceType[]

    @Field(() => PublicOfferType, { nullable: true })
    offer!: PublicOfferType | null
}

/** The user's own subscription. Null when they are on the free plan. */
@ObjectType('MySubscription')
export class MySubscriptionType {
    @Field(() => ID)
    id!: string

    @Field(() => String)
    planSlug!: string

    @Field(() => String)
    planName!: string

    @Field(() => String, { description: 'stripe | paypal | manual' })
    gateway!: string

    @Field(() => String)
    status!: string

    @Field(() => Int, { nullable: true })
    amountCents!: number | null

    @Field(() => String, { nullable: true })
    currency!: string | null

    @Field(() => String, { nullable: true })
    interval!: string | null

    @Field(() => Date, { description: 'When the access they have paid for runs out.' })
    currentPeriodEnd!: Date

    @Field(() => Boolean, { description: 'It will not renew; the plan is kept until currentPeriodEnd.' })
    cancelAtPeriodEnd!: boolean

    @Field(() => String, { nullable: true, description: 'A downgrade that lands at the next renewal.' })
    pendingPlanSlug!: string | null

    @Field(() => Boolean, {
        description: 'Whether a cancellation can still be undone. False on PayPal — its cancellation is terminal.',
    })
    canResume!: boolean
}

@ObjectType('MyInvoice')
export class MyInvoiceType {
    @Field(() => ID)
    id!: string

    @Field(() => String, { nullable: true, description: 'The gateway’s invoice number, when it issues one.' })
    number!: string | null

    @Field(() => String)
    status!: string

    @Field(() => Int)
    amountPaidCents!: number

    @Field(() => Int)
    amountDueCents!: number

    @Field(() => String)
    currency!: string

    @Field(() => String, { nullable: true, description: 'The invoice on the gateway’s site.' })
    hostedUrl!: string | null

    @Field(() => String, { nullable: true, description: 'Null for gateways that issue no PDF (PayPal).' })
    pdfUrl!: string | null

    @Field(() => String, {
        nullable: true,
        description: 'Our own generated receipt PDF, for invoices with no gateway document (PayPal).',
    })
    receiptUrl!: string | null

    @Field(() => Date)
    issuedAt!: Date
}

@ObjectType('MyInvoicePage')
export class MyInvoicePageType {
    @Field(() => [MyInvoiceType])
    rows!: MyInvoiceType[]

    @Field(() => Int)
    total!: number
}

/** What the user's ATHLETE plan grants: their own training. */
@ObjectType('MyAthleteEntitlements')
export class MyAthleteEntitlementsType {
    @Field(() => String, { description: 'Slug of the plan this section came from.' })
    plan!: string

    @Field(() => Int, { nullable: true, description: 'How many templates they may create. null = unlimited.' })
    maxTemplates!: number | null

    @Field(() => Int, { nullable: true, description: 'How many mesocycles they may create. null = unlimited.' })
    maxMesocycles!: number | null

    @Field(() => Int, { nullable: true, description: 'How many workouts they may log. null = unlimited.' })
    maxWorkouts!: number | null

    @Field(() => Boolean)
    ai!: boolean
}

/** What the user's COACH plan grants: coaching only. */
@ObjectType('MyCoachEntitlements')
export class MyCoachEntitlementsType {
    @Field(() => String, { description: 'Slug of the plan this section came from.' })
    plan!: string

    @Field(() => Int, { nullable: true, description: 'null = unlimited.' })
    maxAthletes!: number | null

    @Field(() => Boolean)
    planSessions!: boolean

    @Field(() => Int, { nullable: true, description: 'Coaching templates (for athletes). null = unlimited.' })
    maxTemplates!: number | null

    @Field(() => Int, { nullable: true, description: 'Blocks designed for athletes. null = unlimited.' })
    maxMesocycles!: number | null

    @Field(() => Boolean, { description: 'The AI assistant when designing for athletes.' })
    ai!: boolean
}

/**
 * What the user's plans entitle them to — for the UI only; the API is the
 * authority. Athlete and coach plans are independent subscriptions, one section
 * each; `coach` is null for users who do no coaching.
 */
@ObjectType('MyEntitlements')
export class MyEntitlementsType {
    @Field(() => MyAthleteEntitlementsType)
    athlete!: MyAthleteEntitlementsType

    @Field(() => MyCoachEntitlementsType, { nullable: true })
    coach!: MyCoachEntitlementsType | null
}
