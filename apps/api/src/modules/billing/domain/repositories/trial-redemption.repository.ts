import type { PlanAudience } from '../../../../shared/contracts/entitlements'

/**
 * Persistence port for trial redemptions — the record that an account has already
 * used its one free trial in an audience.
 *
 * The checkout reads it to decide whether to grant the trial; the webhook writes it
 * the moment a trial actually starts. Both keyed per (user, audience), because
 * athlete and coach plans are independent subscriptions.
 */
export abstract class TrialRedemptionRepository {
    /** Has this account already used its free trial in this audience? */
    abstract hasRedeemed(userId: string, audience: PlanAudience): Promise<boolean>

    /**
     * Mark the trial as used. **Idempotent**: the webhook can report the same trial
     * more than once, so a second call for the same (user, audience) is a no-op.
     */
    abstract record(userId: string, audience: PlanAudience, now: Date): Promise<void>
}
