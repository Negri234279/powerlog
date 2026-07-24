import type { TicketCategory } from '../ticket-category'
import type { TicketStatus } from '../ticket-status'
import { SupportMessageEntity } from './support-message.entity'

export interface SupportTicketProps {
    id: string
    category: TicketCategory
    subject: string
    status: TicketStatus
    /** Who wrote in — normalized lowercase email. */
    requesterEmail: string
    /** The name they gave, if any. */
    requesterName: string | null
    /** Soft reference to an auth user when the email matches an account; null
     *  otherwise. This is what lets a contact message double as a support ticket. */
    requesterUserId: string | null
    createdAt: Date
    updatedAt: Date
    /** Timestamp of the most recent message — the natural sort key for the inbox. */
    lastMessageAt: Date
    messages: SupportMessageEntity[]
}

/**
 * `SupportTicketEntity` — a contact/support ticket and its message thread. The
 * ticket owns its messages (they are persisted together and never referenced from
 * outside), so this is the aggregate boundary; kept a plain entity because nothing
 * downstream reacts to domain events — the notification runs off an integration
 * event the command handler publishes.
 */
export class SupportTicketEntity {
    private constructor(private readonly props: SupportTicketProps) {}

    /** Open a fresh ticket from an inbound contact message. */
    static open(input: {
        id: string
        category: TicketCategory
        subject: string
        requesterEmail: string
        requesterName: string | null
        requesterUserId: string | null
        message: { id: string; body: string }
        now: Date
    }): SupportTicketEntity {
        const message = SupportMessageEntity.inbound({
            id: input.message.id,
            ticketId: input.id,
            body: input.message.body,
            now: input.now,
        })

        return new SupportTicketEntity({
            id: input.id,
            category: input.category,
            subject: input.subject,
            status: 'open',
            requesterEmail: input.requesterEmail,
            requesterName: input.requesterName,
            requesterUserId: input.requesterUserId,
            createdAt: input.now,
            updatedAt: input.now,
            lastMessageAt: input.now,
            messages: [message],
        })
    }

    /** Reconstruct from persistence (messages sorted oldest-first). */
    static rehydrate(props: SupportTicketProps): SupportTicketEntity {
        return new SupportTicketEntity(props)
    }

    close(now: Date): void {
        this.props.status = 'closed'
        this.props.updatedAt = now
    }

    reopen(now: Date): void {
        this.props.status = 'open'
        this.props.updatedAt = now
    }

    get id(): string {
        return this.props.id
    }
    get category(): TicketCategory {
        return this.props.category
    }
    get subject(): string {
        return this.props.subject
    }
    get status(): TicketStatus {
        return this.props.status
    }
    get requesterEmail(): string {
        return this.props.requesterEmail
    }
    get requesterName(): string | null {
        return this.props.requesterName
    }
    get requesterUserId(): string | null {
        return this.props.requesterUserId
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
    get updatedAt(): Date {
        return this.props.updatedAt
    }
    get lastMessageAt(): Date {
        return this.props.lastMessageAt
    }
    get messages(): readonly SupportMessageEntity[] {
        return this.props.messages
    }
}
