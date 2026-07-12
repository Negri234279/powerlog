import type { CoachInvitationEntity } from '../domain/entities/coach-invitation.entity'
import type { InvitationStatus } from '../domain/invitation-status'

/** Invitation as returned to the inviting/handling party. */
export interface InvitationView {
    id: string
    coachId: string
    /** null while the invited email has no account yet. */
    athleteId: string | null
    email: string
    status: InvitationStatus
    createdAt: Date
}

/** A pending invitation as the athlete sees it (coach resolved to a handle). */
export interface PendingInvitationView {
    id: string
    coachId: string
    coachUsername: string
    createdAt: Date
}

/** A linked user (coach or athlete) resolved to its public handle + avatar. */
export interface CoachUserView {
    userId: string
    username: string
    /** Real name, when they filled it in — only ever shown to the person they are
     *  linked to. Null when unset. */
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
}

/** Public preview of a pending invitation, for the invite-aware signup page. */
export interface CoachInvitationPreview {
    /** The invited email (prefilled + locked on the signup form). */
    email: string
    /** The inviting coach's handle, for the "invited by @coach" banner. */
    coachUsername: string
    /** A valid handle derived from the email, checked available at read time. */
    suggestedUsername: string
}

export function toInvitationView(invitation: CoachInvitationEntity): InvitationView {
    return {
        id: invitation.id,
        coachId: invitation.coachId,
        athleteId: invitation.athleteId,
        email: invitation.email,
        status: invitation.status,
        createdAt: invitation.createdAt,
    }
}
