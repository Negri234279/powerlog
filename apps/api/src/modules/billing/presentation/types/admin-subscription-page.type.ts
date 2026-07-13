import { Field, ID, Int, ObjectType } from '@nestjs/graphql'

@ObjectType('AdminSubscription')
export class AdminSubscriptionType {
    @Field(() => ID)
    id!: string

    @Field(() => ID)
    userId!: string

    @Field(() => String, { nullable: true, description: 'Null if the account is gone.' })
    email!: string | null

    @Field(() => String, { nullable: true })
    username!: string | null

    @Field(() => ID)
    planId!: string

    @Field(() => String)
    planSlug!: string

    @Field(() => String)
    planName!: string

    @Field(() => String, { description: 'stripe | paypal | manual' })
    gateway!: string

    @Field(() => String)
    status!: string

    @Field(() => Int, { nullable: true, description: 'Null for a manual grant: nothing is charged.' })
    amountCents!: number | null

    @Field(() => String, { nullable: true })
    currency!: string | null

    @Field(() => String, { nullable: true })
    interval!: string | null

    @Field(() => Date)
    currentPeriodStart!: Date

    @Field(() => Date)
    currentPeriodEnd!: Date

    @Field(() => Boolean)
    cancelAtPeriodEnd!: boolean

    @Field(() => Date)
    createdAt!: Date
}

@ObjectType('AdminSubscriptionPage')
export class AdminSubscriptionPageType {
    @Field(() => [AdminSubscriptionType])
    rows!: AdminSubscriptionType[]

    @Field(() => Int)
    total!: number

    @Field(() => Int)
    limit!: number

    @Field(() => Int)
    offset!: number
}
