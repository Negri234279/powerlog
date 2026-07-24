import { Field, ID, Int, ObjectType } from '@nestjs/graphql'

/** The health of one payment integration, as an operator needs to see it. */
@ObjectType('GatewayStatus')
export class GatewayStatusType {
    @Field(() => String)
    gateway!: string

    @Field(() => Boolean, { description: 'Whether this deployment has keys for it at all.' })
    configured!: boolean

    @Field(() => Int)
    syncedPlans!: number

    @Field(() => Int)
    totalPlans!: number

    @Field(() => Date, {
        nullable: true,
        description: 'A long silence here means the endpoint is broken — the cheapest signal there is.',
    })
    lastWebhookAt!: Date | null

    @Field(() => Int)
    failedWebhooks!: number
}

@ObjectType('BillingWebhookEvent')
export class BillingWebhookEventType {
    @Field(() => ID)
    id!: string

    @Field(() => String)
    gateway!: string

    @Field(() => String, { description: 'The provider’s own event id — the idempotency key.' })
    eventId!: string

    @Field(() => String)
    type!: string

    @Field(() => String, { description: 'received | processed | failed' })
    status!: string

    @Field(() => String, { nullable: true })
    error!: string | null

    @Field(() => Date)
    receivedAt!: Date

    @Field(() => Date, { nullable: true })
    processedAt!: Date | null
}

@ObjectType('BillingWebhookEventPage')
export class BillingWebhookEventPageType {
    @Field(() => [BillingWebhookEventType])
    rows!: BillingWebhookEventType[]

    @Field(() => Int)
    total!: number
}

/** What one gateway's books say versus ours. `total` should always be 0. */
@ObjectType('BillingDrift')
export class BillingDriftType {
    @Field(() => String)
    gateway!: string

    @Field(() => Int, {
        nullable: true,
        description: 'Null when the provider could not be asked — no signal, which is not the same as no drift.',
    })
    total!: number | null

    @Field(() => [String], { description: 'Live at the gateway but not here: a webhook we never received.' })
    missingLocally!: string[]

    @Field(() => [String], { description: 'Live here but not at the gateway: a plan granted to nobody paying.' })
    staleLocally!: string[]
}
