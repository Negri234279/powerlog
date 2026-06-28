import { Field, ID, ObjectType } from '@nestjs/graphql'

/** An in-app notification as exposed over GraphQL. */
@ObjectType('Notification')
export class NotificationType {
    @Field(() => ID)
    id!: string

    @Field(() => String, { description: 'Notification kind, e.g. "coach_invitation".' })
    type!: string

    @Field(() => String, { description: 'Type-specific payload, JSON-encoded.' })
    data!: string

    @Field(() => Date, { nullable: true, description: 'When the user read it; null while unread.' })
    readAt?: Date | null

    @Field()
    createdAt!: Date
}

/** One keyset page of notifications. */
@ObjectType('NotificationsPage')
export class NotificationsPageType {
    @Field(() => [NotificationType])
    items!: NotificationType[]

    @Field(() => String, { nullable: true, description: 'Cursor for the next page; null when last.' })
    nextCursor?: string | null

    @Field()
    hasNextPage!: boolean
}
