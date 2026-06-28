import { Field, ID, ObjectType } from '@nestjs/graphql'

/** A coach↔athlete invitation as exposed over GraphQL. */
@ObjectType('CoachInvitation')
export class CoachInvitationType {
    @Field(() => ID)
    id!: string

    @Field(() => ID)
    coachId!: string

    @Field(() => ID)
    athleteId!: string

    @Field(() => String, { description: 'pending | accepted | declined | cancelled' })
    status!: string

    @Field()
    createdAt!: Date
}

/** A pending invitation as the athlete sees it (coach resolved to a handle). */
@ObjectType('PendingInvitation')
export class PendingInvitationType {
    @Field(() => ID)
    id!: string

    @Field(() => ID)
    coachId!: string

    @Field(() => String, { description: "The inviting coach's username." })
    coachUsername!: string

    @Field()
    createdAt!: Date
}

/** A linked user (coach or athlete), resolved to its public handle. */
@ObjectType('CoachUser')
export class CoachUserType {
    @Field(() => ID)
    userId!: string

    @Field(() => String)
    username!: string
}
