import { Field, Float, Int, ObjectType } from '@nestjs/graphql'

/**
 * A planned target as its two bounds. Equal bounds are a single value (`5`);
 * different ones a span (`5-8`). The field itself is nullable when nothing was
 * planned, so the client never has to read `5-5` off the wire — it formats the
 * pair back into what the coach typed.
 */
@ObjectType('IntRange')
export class IntRangeType {
    @Field(() => Int)
    min!: number

    @Field(() => Int)
    max!: number
}

@ObjectType('FloatRange')
export class FloatRangeType {
    @Field(() => Float)
    min!: number

    @Field(() => Float)
    max!: number
}
