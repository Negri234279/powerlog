/** Where an invitation ended up. `sent` counts the issue, the rest the outcome. */
export type InvitationOutcome = 'sent' | 'accepted' | 'declined' | 'cancelled'

/**
 * Whether the invited email already had an account when the invitation moved.
 * `new` is the acquisition path: the athlete is auto-linked when they sign up,
 * which happens in an event handler — no command, so the CQRS counters can't see
 * it. This label is what makes coaching measurable as a growth channel.
 */
export type Invitee = 'existing' | 'new'

/** Who ended the coaching relationship (the churn signal). */
export type UnlinkedBy = 'coach' | 'athlete'

/**
 * Abstracts the coaching observability counters so the application handlers stay
 * free of prom-client. Infrastructure binds it to a Prometheus-backed adapter;
 * tests use a recording fake.
 *
 * Deliberately narrow: everything the per-command CQRS histograms already count
 * (rates and failures of invite/accept/decline/cancel/remove) is NOT repeated here.
 */
export abstract class CoachingMetrics {
    abstract recordInvitation(outcome: InvitationOutcome, invitee: Invitee): void
    abstract recordLinkRemoved(by: UnlinkedBy): void
}
