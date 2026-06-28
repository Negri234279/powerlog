import { Field, ID, Int, ObjectType } from '@nestjs/graphql'

/**
 * The authenticated user's profile as exposed over GraphQL. Nullable string
 * fields declare an explicit type — a `string | null` union can't be inferred
 * from reflection metadata.
 */
@ObjectType('Profile')
export class ProfileType {
    @Field(() => ID)
    userId!: string

    @Field()
    displayName!: string

    @Field(() => String, { nullable: true })
    firstName?: string | null

    @Field(() => String, { nullable: true })
    lastName?: string | null

    @Field(() => String, { nullable: true, description: 'Birth date as YYYY-MM-DD.' })
    birthDate?: string | null

    @Field(() => String, { nullable: true, description: '"male" or "female".' })
    sex?: string | null

    @Field(() => Int, { nullable: true, description: 'Height in centimetres.' })
    heightCm?: number | null

    @Field(() => String, { nullable: true })
    bio?: string | null

    @Field(() => String, { nullable: true, description: 'Avatar URL; null → client shows the default.' })
    avatarUrl?: string | null

    @Field(() => String, { nullable: true, description: 'ISO 3166-1 alpha-2 country code.' })
    country?: string | null

    @Field(() => String, { nullable: true, description: 'IANA timezone, e.g. "Europe/Madrid".' })
    timezone?: string | null

    @Field(() => String, { nullable: true, description: 'BCP 47 locale, e.g. "es-ES".' })
    locale?: string | null

    @Field()
    createdAt!: Date

    @Field()
    updatedAt!: Date
}
