/**
 * Lifecycle of a coach→athlete invitation. Single source of truth for the
 * domain and the `coach_invitation_status` pgEnum. Only `pending` invitations
 * can transition; the rest are terminal.
 */
export const INVITATION_STATUSES = ['pending', 'accepted', 'declined', 'cancelled'] as const

export type InvitationStatus = (typeof INVITATION_STATUSES)[number]
