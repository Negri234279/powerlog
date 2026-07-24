import { Field, ID, Int, ObjectType } from '@nestjs/graphql'

/** One row of the admin ticket inbox. */
@ObjectType('AdminSupportTicket')
export class AdminSupportTicketType {
    @Field(() => ID)
    id!: string

    @Field(() => String, { description: 'general | billing | bug | account | feature | other' })
    category!: string

    @Field(() => String)
    subject!: string

    @Field(() => String, { description: 'open | closed' })
    status!: string

    @Field(() => String)
    requesterEmail!: string

    @Field(() => String, { nullable: true })
    requesterName!: string | null

    @Field(() => ID, { nullable: true, description: 'Linked account, if the email matched one.' })
    requesterUserId!: string | null

    @Field(() => String, { nullable: true, description: "The linked account's handle." })
    requesterUsername!: string | null

    @Field(() => Int)
    messageCount!: number

    @Field(() => Date)
    createdAt!: Date

    @Field(() => Date)
    lastMessageAt!: Date
}

@ObjectType('AdminSupportTicketPage')
export class AdminSupportTicketPageType {
    @Field(() => [AdminSupportTicketType])
    rows!: AdminSupportTicketType[]

    @Field(() => Int)
    total!: number

    @Field(() => Int)
    limit!: number

    @Field(() => Int)
    offset!: number
}

/** One message in a ticket thread. */
@ObjectType('SupportMessage')
export class SupportMessageType {
    @Field(() => ID)
    id!: string

    @Field(() => String, { description: 'inbound (from the requester) | outbound (staff reply)' })
    direction!: string

    @Field(() => String)
    body!: string

    @Field(() => ID, { nullable: true, description: 'The staff author of an outbound reply; null for inbound.' })
    authorUserId!: string | null

    @Field(() => Date)
    createdAt!: Date
}

/** A ticket and its full thread, for the admin detail page. */
@ObjectType('AdminSupportTicketDetail')
export class AdminSupportTicketDetailType {
    @Field(() => ID)
    id!: string

    @Field(() => String)
    category!: string

    @Field(() => String)
    subject!: string

    @Field(() => String)
    status!: string

    @Field(() => String)
    requesterEmail!: string

    @Field(() => String, { nullable: true })
    requesterName!: string | null

    @Field(() => ID, { nullable: true })
    requesterUserId!: string | null

    @Field(() => String, { nullable: true })
    requesterUsername!: string | null

    @Field(() => Date)
    createdAt!: Date

    @Field(() => Date)
    updatedAt!: Date

    @Field(() => Date)
    lastMessageAt!: Date

    @Field(() => [SupportMessageType])
    messages!: SupportMessageType[]
}
