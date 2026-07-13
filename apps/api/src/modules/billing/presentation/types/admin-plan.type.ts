import { Field, ID, Int, ObjectType } from '@nestjs/graphql'

import { JsonValue } from '../../../../graphql/json.scalar'

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

    @Field(() => Boolean)
    templates!: boolean

    @Field(() => Boolean)
    mesocycles!: boolean

    @Field(() => Boolean)
    ai!: boolean

    @Field(() => Boolean)
    planSessions!: boolean

    @Field(() => Int, { nullable: true, description: 'null = unlimited.' })
    maxAthletes!: number | null
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

    @Field(() => Date)
    createdAt!: Date

    @Field(() => Date)
    updatedAt!: Date
}
