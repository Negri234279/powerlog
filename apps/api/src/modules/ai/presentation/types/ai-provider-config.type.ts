import { Field, ObjectType } from '@nestjs/graphql'

/**
 * A configured provider, as the client sees it. The API key is absent by
 * construction — only `keyLast4` crosses the wire, so the UI can show which key
 * is stored without it ever being readable.
 *
 * `provider` is a plain String rather than a GraphQL enum, matching how the
 * profile exposes `sex`: the value is validated by zod at the edge and by the
 * `AiProviderVO` in the domain.
 */
@ObjectType('AiProviderConfig')
export class AiProviderConfigType {
    @Field(() => String, { description: '"openai" or "anthropic".' })
    provider!: string

    @Field(() => String, { description: 'Last four characters of the stored key.' })
    keyLast4!: string

    @Field(() => String, { nullable: true, description: 'Selected model id; null → none picked yet.' })
    model!: string | null

    @Field(() => Boolean, { description: 'Whether powerlog may use this key.' })
    enabled!: boolean

    @Field(() => Date)
    createdAt!: Date

    @Field(() => Date)
    updatedAt!: Date
}
