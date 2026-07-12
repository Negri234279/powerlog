import { AdminCoachingResolver } from './resolvers/admin-coaching.resolver'
import { CoachInvitationPreviewResolver } from './resolvers/coach-invitation-preview.resolver'
import { CoachingResolver } from './resolvers/coaching.resolver'

/** GraphQL resolvers for the coaching module. */
export const COACHING_RESOLVERS = [CoachingResolver, CoachInvitationPreviewResolver, AdminCoachingResolver]
