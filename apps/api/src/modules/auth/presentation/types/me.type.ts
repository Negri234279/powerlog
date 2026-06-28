import { Field, ID, ObjectType } from '@nestjs/graphql'

/** The authenticated user as exposed over GraphQL. */
@ObjectType('Me')
export class MeType {
    @Field(() => ID)
    id!: string

    @Field()
    email!: string

    @Field({ description: 'Public handle (unique).' })
    username!: string

    @Field({ description: 'Unit preference: "kg" or "lb".' })
    units!: string

    @Field({ description: 'User role: "athlete" or "coach".' })
    role!: string

    @Field({ description: 'Whether the user has admin privileges.' })
    isAdmin!: boolean

    @Field({ description: 'Whether the email address has been verified.' })
    emailVerified!: boolean

    @Field({
        description: 'Whether the account has a password (vs Google-only).',
    })
    hasPassword!: boolean

    @Field()
    createdAt!: Date
}
