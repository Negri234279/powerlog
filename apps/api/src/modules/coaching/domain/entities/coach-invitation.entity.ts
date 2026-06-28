import { InvalidInvitationStateError } from '../errors/coaching.errors'
import type { InvitationStatus } from '../invitation-status'

export interface CoachInvitationProps {
    id: string
    coachId: string
    athleteId: string
    status: InvitationStatus
    createdAt: Date
    updatedAt: Date
}

/**
 * `CoachInvitationEntity` — a coach's pending request to coach an athlete. Plain
 * entity (not an aggregate; the m2m link is its own row). `coachId`/`athleteId`
 * are soft references to auth users. Only a `pending` invitation can transition.
 */
export class CoachInvitationEntity {
    private constructor(private readonly props: CoachInvitationProps) {}

    /** Create a fresh, pending invitation. Id + timestamp come from the app. */
    static create(input: { id: string; coachId: string; athleteId: string; now: Date }): CoachInvitationEntity {
        return new CoachInvitationEntity({
            id: input.id,
            coachId: input.coachId,
            athleteId: input.athleteId,
            status: 'pending',
            createdAt: input.now,
            updatedAt: input.now,
        })
    }

    /** Reconstruct from persistence. */
    static rehydrate(props: CoachInvitationProps): CoachInvitationEntity {
        return new CoachInvitationEntity(props)
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
    get athleteId(): string {
        return this.props.athleteId
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
