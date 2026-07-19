import type { PlanAudience } from '../../../src/shared/contracts/entitlements'
import { TrialRedemptionRepository } from '../../../src/modules/billing/domain/repositories/trial-redemption.repository'

/** In-memory TrialRedemptionRepository implementing the real port. */
export class InMemoryTrialRedemptionRepository extends TrialRedemptionRepository {
    private readonly redeemed = new Set<string>()

    constructor(seed: { userId: string; audience: PlanAudience }[] = []) {
        super()
        for (const entry of seed) this.redeemed.add(this.key(entry.userId, entry.audience))
    }

    async hasRedeemed(userId: string, audience: PlanAudience): Promise<boolean> {
        return this.redeemed.has(this.key(userId, audience))
    }

    async record(userId: string, audience: PlanAudience, _now: Date): Promise<void> {
        this.redeemed.add(this.key(userId, audience))
    }

    private key(userId: string, audience: PlanAudience): string {
        return `${userId}:${audience}`
    }
}
