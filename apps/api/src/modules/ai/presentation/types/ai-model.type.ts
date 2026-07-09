import { Field, ObjectType } from '@nestjs/graphql'

/** A model the user's key may call, fetched live from the provider. */
@ObjectType('AiModel')
export class AiModelType {
    @Field(() => String)
    id!: string

    @Field(() => String)
    displayName!: string
}
