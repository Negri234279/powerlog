import { Field, ID, ObjectType } from '@nestjs/graphql'

/** A coach↔athlete invitation as exposed over GraphQL. */
@ObjectType('CoachInvitation')
export class CoachInvitationType {
    @Field(() => ID)
    id!: string

    @Field(() => ID)
    coachId!: string

    @Field(() => ID, { nullable: true, description: 'Null while the invited email has no account yet.' })
    athleteId!: string | null

    @Field(() => String, { description: 'The email the invitation was addressed to.' })
    email!: string

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

    @Field(() => String, { nullable: true, description: 'Resolved avatar URL; null → show initials.' })
    avatarUrl!: string | null
}

/** A coach's private note on one athlete. */
@ObjectType('CoachAthleteNote')
export class CoachAthleteNoteType {
    @Field(() => String)
    body!: string

    @Field()
    updatedAt!: Date
}
