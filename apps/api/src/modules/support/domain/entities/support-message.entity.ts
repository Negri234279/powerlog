import type { MessageDirection } from '../message-direction'

export interface SupportMessageProps {
    id: string
    ticketId: string
    direction: MessageDirection
    body: string
    /** The staff member who wrote an outbound reply; null for inbound messages. */
    authorUserId: string | null
    createdAt: Date
}

/**
 * `SupportMessageEntity` — one message in a ticket thread. Plain entity owned by
 * the ticket. `inbound` is the person who wrote in; `outbound` (a staff reply) is
 * the future seam, not wired yet.
 */
export class SupportMessageEntity {
    private constructor(private readonly props: SupportMessageProps) {}

    /** The first (or a later) message from the person who opened the ticket. */
    static inbound(input: { id: string; ticketId: string; body: string; now: Date }): SupportMessageEntity {
        return new SupportMessageEntity({
            id: input.id,
            ticketId: input.ticketId,
            direction: 'inbound',
            body: input.body,
            authorUserId: null,
            createdAt: input.now,
        })
    }

    /** Reconstruct from persistence. */
    static rehydrate(props: SupportMessageProps): SupportMessageEntity {
        return new SupportMessageEntity(props)
    }

    get id(): string {
        return this.props.id
    }
    get ticketId(): string {
        return this.props.ticketId
    }
    get direction(): MessageDirection {
        return this.props.direction
    }
    get body(): string {
        return this.props.body
    }
    get authorUserId(): string | null {
        return this.props.authorUserId
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
}
