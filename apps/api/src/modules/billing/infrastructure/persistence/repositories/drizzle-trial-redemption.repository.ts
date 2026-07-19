import { Inject, Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'

import type { PlanAudience } from '../../../../../shared/contracts/entitlements'
import { type Database, DRIZZLE } from '../../../../../database/database.module'
import { TrialRedemptionRepository } from '../../../domain/repositories/trial-redemption.repository'
import { trialRedemptions } from '../schema/trial-redemptions.schema'

@Injectable()
export class DrizzleTrialRedemptionRepository extends TrialRedemptionRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async hasRedeemed(userId: string, audience: PlanAudience): Promise<boolean> {
        const [row] = await this.db
            .select({ id: trialRedemptions.id })
            .from(trialRedemptions)
            .where(and(eq(trialRedemptions.userId, userId), eq(trialRedemptions.audience, audience)))
            .limit(1)

        return row !== undefined
    }

    async record(userId: string, audience: PlanAudience, now: Date): Promise<void> {
        // Idempotent: the unique (user, audience) index turns a repeated webhook into
        // a no-op instead of a second row.
        await this.db
            .insert(trialRedemptions)
            .values({ userId, audience, redeemedAt: now })
            .onConflictDoNothing({ target: [trialRedemptions.userId, trialRedemptions.audience] })
    }
}
