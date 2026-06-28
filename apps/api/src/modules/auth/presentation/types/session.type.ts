import { Field, ID, ObjectType } from '@nestjs/graphql'

/** An active session (device) as exposed over GraphQL. `id` is the family id. */
@ObjectType('Session')
export class SessionType {
    @Field(() => ID)
    id!: string

    @Field(() => String, { nullable: true })
    userAgent?: string | null

    @Field(() => String, { nullable: true })
    ip?: string | null

    @Field({ description: 'When this session was last used (last token rotation).' })
    lastUsedAt!: Date

    @Field({ description: 'Whether this is the session making the request.' })
    current!: boolean
}
