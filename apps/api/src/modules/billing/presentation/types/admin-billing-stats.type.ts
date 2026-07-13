import { Field, Int, ObjectType } from '@nestjs/graphql'

@ObjectType('SubscriptionsByStatus')
export class SubscriptionsByStatusType {
    @Field(() => String)
    status!: string

    @Field(() => String)
    gateway!: string

    @Field(() => Int)
    count!: number
}

@ObjectType('SubscriptionsByPlan')
export class SubscriptionsByPlanType {
    @Field(() => String)
    plan!: string

    @Field(() => String)
    audience!: string

    @Field(() => Int)
    count!: number
}

@ObjectType('MrrByPlan')
export class MrrByPlanType {
    @Field(() => String)
    plan!: string

    @Field(() => String)
    currency!: string

    @Field(() => Int, { description: 'Monthly-normalised cents: a yearly plan is not 12× a monthly one.' })
    amountCents!: number
}

/** Aggregate billing figures (admin only). The same read model feeds the Grafana gauges. */
@ObjectType('AdminBillingStats')
export class AdminBillingStatsType {
    @Field(() => [SubscriptionsByStatusType])
    byStatus!: SubscriptionsByStatusType[]

    @Field(() => [SubscriptionsByPlanType])
    byPlan!: SubscriptionsByPlanType[]

    @Field(() => [MrrByPlanType])
    mrr!: MrrByPlanType[]

    @Field(() => Int, { description: 'Subscriptions currently granting their plan.' })
    activeSubscriptions!: number

    @Field(() => Int)
    trialing!: number

    @Field(() => Int)
    pastDue!: number

    @Field(() => Int, { description: 'Cancelled but still inside the period they paid for.' })
    canceling!: number
}
