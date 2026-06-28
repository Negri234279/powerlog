import { Field, ID, Int, ObjectType } from '@nestjs/graphql'

/** A user as seen by an admin (auth fields + the handle from the profile). */
@ObjectType('AdminUser')
export class AdminUserType {
    @Field(() => ID)
    id!: string

    @Field()
    email!: string

    @Field(() => String, { nullable: true, description: 'Public handle, or null if no profile yet.' })
    username!: string | null

    @Field({ description: 'User role: "athlete" or "coach".' })
    role!: string

    @Field()
    isAdmin!: boolean

    @Field({ description: 'Account status: "active" | "disabled" | "deleted".' })
    status!: string

    @Field()
    emailVerified!: boolean

    @Field()
    createdAt!: Date
}

/** A page of admin users with the total count for pagination. */
@ObjectType('AdminUserPage')
export class AdminUserPageType {
    @Field(() => [AdminUserType])
    rows!: AdminUserType[]

    @Field(() => Int, { description: 'Total users matching the filter (ignoring pagination).' })
    total!: number

    @Field(() => Int)
    limit!: number

    @Field(() => Int)
    offset!: number
}

/** Aggregate user counts for the admin dashboard. */
@ObjectType('AdminUserStats')
export class AdminUserStatsType {
    @Field(() => Int)
    total!: number

    @Field(() => Int)
    athletes!: number

    @Field(() => Int)
    coaches!: number

    @Field(() => Int)
    admins!: number

    @Field(() => Int)
    verified!: number

    @Field(() => Int)
    active!: number

    @Field(() => Int)
    disabled!: number

    @Field(() => Int)
    newLast7Days!: number

    @Field(() => Int)
    newLast30Days!: number
}
