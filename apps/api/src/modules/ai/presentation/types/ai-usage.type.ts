import { Field, Float, Int, ObjectType } from '@nestjs/graphql'

/**
 * A user's spend on one model. Token counts are `Float` (they are running sums
 * that can outgrow a 32-bit Int); prices and cost are nullable — a model with no
 * known price is still metered in tokens, shown as "—" rather than a fake figure.
 */
@ObjectType('AiUsageRow')
export class AiUsageRowType {
    @Field(() => String, { description: '"openai" or "anthropic".' })
    provider!: string

    @Field(() => String)
    model!: string

    @Field(() => Float)
    inputTokens!: number

    @Field(() => Float)
    outputTokens!: number

    @Field(() => Float, { nullable: true, description: 'Current USD per 1M input tokens; null → price unknown.' })
    inputPricePerMTok!: number | null

    @Field(() => Float, { nullable: true, description: 'Current USD per 1M output tokens; null → price unknown.' })
    outputPricePerMTok!: number | null

    @Field(() => Float, { nullable: true, description: 'Total cost so far; null → the model has no known price.' })
    totalCost!: number | null

    @Field(() => Int)
    requests!: number

    @Field(() => Date)
    lastUsedAt!: Date
}

@ObjectType('AiUsageTotals')
export class AiUsageTotalsType {
    @Field(() => Float)
    inputTokens!: number

    @Field(() => Float)
    outputTokens!: number

    @Field(() => Float, { nullable: true })
    totalCost!: number | null

    @Field(() => Int)
    requests!: number
}

@ObjectType('AiUsageSummary')
export class AiUsageSummaryType {
    @Field(() => [AiUsageRowType], { description: 'One line per (provider, model), most expensive first.' })
    rows!: AiUsageRowType[]

    @Field(() => AiUsageTotalsType)
    totals!: AiUsageTotalsType

    @Field(() => String, { description: 'ISO 4217 currency of every cost figure (USD).' })
    currency!: string
}
