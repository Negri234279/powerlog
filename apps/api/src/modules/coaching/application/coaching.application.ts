import { AcceptInvitationHandler } from './commands/accept-invitation/accept-invitation.handler'
import { CancelInvitationHandler } from './commands/cancel-invitation/cancel-invitation.handler'
import { DeclineInvitationHandler } from './commands/decline-invitation/decline-invitation.handler'
import { InviteAthleteHandler } from './commands/invite-athlete/invite-athlete.handler'
import { SetAthleteNoteHandler } from './commands/set-athlete-note/set-athlete-note.handler'
import { LinkInvitationsOnUserRegistered } from './event-handlers/link-invitations-on-user-registered.handler'
import { AdminCoachingStatsHandler } from './queries/admin-coaching-stats/admin-coaching-stats.handler'
import { GetAthleteNoteHandler } from './queries/get-athlete-note/get-athlete-note.handler'
import { GetCoachInvitationPreviewHandler } from './queries/get-coach-invitation-preview/get-coach-invitation-preview.handler'
import { MyAthletesHandler } from './queries/my-athletes/my-athletes.handler'
import { MyCoachesHandler } from './queries/my-coaches/my-coaches.handler'
import { PendingInvitationsHandler } from './queries/pending-invitations/pending-invitations.handler'

/** CQRS command handlers for the coaching module. */
export const COACHING_COMMAND_HANDLERS = [
    InviteAthleteHandler,
    AcceptInvitationHandler,
    DeclineInvitationHandler,
    CancelInvitationHandler,
    SetAthleteNoteHandler,
]

/** CQRS query handlers for the coaching module. */
export const COACHING_QUERY_HANDLERS = [
    MyCoachesHandler,
    MyAthletesHandler,
    PendingInvitationsHandler,
    GetAthleteNoteHandler,
    GetCoachInvitationPreviewHandler,
    AdminCoachingStatsHandler,
]

/** Integration-event handlers (react to events on the bus). */
export const COACHING_EVENT_HANDLERS = [LinkInvitationsOnUserRegistered]
