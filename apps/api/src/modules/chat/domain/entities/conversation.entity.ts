export interface ConversationProps {
    id: string
    coachId: string
    athleteId: string
    createdAt: Date
}

/**
 * `ConversationEntity` — the single chat thread for a coach↔athlete pair. Plain
 * entity (not an aggregate root; no domain events). `coachId`/`athleteId` are
 * soft references to the auth users. Created once, when the link is established,
 * and it SURVIVES an unlink: the same pair always maps to the same conversation,
 * even after re-linking — identity is the pair, not the live link.
 */
export class ConversationEntity {
    private constructor(private readonly props: ConversationProps) {}

    /** Create a fresh conversation for a coach↔athlete pair. */
    static create(input: { id: string; coachId: string; athleteId: string; now: Date }): ConversationEntity {
        return new ConversationEntity({
            id: input.id,
            coachId: input.coachId,
            athleteId: input.athleteId,
            createdAt: input.now,
        })
    }

    /** Reconstruct from persistence. */
    static rehydrate(props: ConversationProps): ConversationEntity {
        return new ConversationEntity(props)
    }

    /** Whether the user is a participant (the coach or the athlete). */
    involves(userId: string): boolean {
        return this.props.coachId === userId || this.props.athleteId === userId
    }

    /** The other participant's id, given one of them; null if `userId` isn't one. */
    otherParticipant(userId: string): string | null {
        if (userId === this.props.coachId) return this.props.athleteId
        if (userId === this.props.athleteId) return this.props.coachId
        return null
    }

    get id(): string {
        return this.props.id
    }

    get coachId(): string {
        return this.props.coachId
    }

    get athleteId(): string {
        return this.props.athleteId
    }

    get createdAt(): Date {
        return this.props.createdAt
    }
}
