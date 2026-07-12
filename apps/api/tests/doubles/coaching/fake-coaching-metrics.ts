import { CoachingMetrics } from '../../../src/modules/coaching/application/ports/coaching-metrics.port'
import type {
    InvitationOutcome,
    Invitee,
    UnlinkedBy,
} from '../../../src/modules/coaching/application/ports/coaching-metrics.port'

/** Recording CoachingMetrics double so tests can assert what was counted. */
export class FakeCoachingMetrics extends CoachingMetrics {
    readonly invitations: { outcome: InvitationOutcome; invitee: Invitee }[] = []
    readonly linksRemoved: UnlinkedBy[] = []

    recordInvitation(outcome: InvitationOutcome, invitee: Invitee): void {
        this.invitations.push({ outcome, invitee })
    }

    recordLinkRemoved(by: UnlinkedBy): void {
        this.linksRemoved.push(by)
    }
}
