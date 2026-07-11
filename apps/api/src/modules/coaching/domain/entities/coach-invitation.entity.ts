import { InvalidInvitationStateError } from '../errors/coaching.errors'
import type { InvitationStatus } from '../invitation-status'

export interface CoachInvitationProps {
    id: string
    coachId: string
    /** The invited athlete once resolved to an account; null while unregistered. */
    athleteId: string | null
    /** The email the invitation was addressed to (normalized lowercase). */
    email: string
    status: InvitationStatus
    createdAt: Date
    updatedAt: Date
}

/**
 * `CoachInvitationEntity` — a coach's pending request to coach an athlete,
 * addressed to an email. Plain entity (not an aggregate; the m2m link is its own
 * row). `coachId`/`athleteId` are soft references to auth users; `athleteId` is
 * null until the invitee has an account. Only a `pending` invitation transitions.
 */
export class CoachInvitationEntity {
    private constructor(private readonly props: CoachInvitationProps) {}

    /**
     * Create a fresh, pending invitation for `email`. `athleteId` is set when the
     * email already belongs to a user, or null for a not-yet-registered invitee.
     */
    static create(input: {
        id: string
        coachId: string
        email: string
        athleteId?: string | null
        now: Date
    }): CoachInvitationEntity {
        return new CoachInvitationEntity({
            id: input.id,
            coachId: input.coachId,
            athleteId: input.athleteId ?? null,
            email: input.email,
            status: 'pending',
            createdAt: input.now,
            updatedAt: input.now,
        })
    }

    /** Reconstruct from persistence. */
    static rehydrate(props: CoachInvitationProps): CoachInvitationEntity {
        return new CoachInvitationEntity(props)
    }

    /** Bind a now-registered account to this invitation (idempotent while null). */
    linkAthlete(athleteId: string, now: Date): void {
        if (this.props.athleteId === null) {
            this.props.athleteId = athleteId
            this.props.updatedAt = now
        }
    }

    accept(now: Date): void {
        this.transitionTo('accepted', now)
    }

    decline(now: Date): void {
        this.transitionTo('declined', now)
    }

    cancel(now: Date): void {
        this.transitionTo('cancelled', now)
    }

    isPending(): boolean {
        return this.props.status === 'pending'
    }

    private transitionTo(status: InvitationStatus, now: Date): void {
        if (this.props.status !== 'pending') {
            throw new InvalidInvitationStateError()
        }
        this.props.status = status
        this.props.updatedAt = now
    }

    get id(): string {
        return this.props.id
    }
    get coachId(): string {
        return this.props.coachId
    }
    get athleteId(): string | null {
        return this.props.athleteId
    }
    get email(): string {
        return this.props.email
    }
    get status(): InvitationStatus {
        return this.props.status
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
    get updatedAt(): Date {
        return this.props.updatedAt
    }
}
