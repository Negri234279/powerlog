import { Injectable } from '@nestjs/common'
import { PinoLogger } from 'nestjs-pino'

import type { PaymentGateway } from '../../domain/entities/subscription.entity'
import { PlanPriceRepository } from '../../domain/repositories/plan-price.repository'
import { PlanRepository } from '../../domain/repositories/plan.repository'
import { SubscriptionRepository } from '../../domain/repositories/subscription.repository'
import { GatewayProvider } from '../ports/gateway-provider.port'

/** What one gateway's books say versus ours. */
export interface GatewayDrift {
    gateway: PaymentGateway
    /** Live over there but not here — a webhook we never got. Someone is paying for nothing. */
    missingLocally: string[]
    /** Live here but not there — we are granting a plan nobody is paying for. */
    staleLocally: string[]
    /** Null when the provider could not answer: no signal, not "no drift". */
    total: number | null
}

/**
 * Compares each gateway's live subscriptions against ours.
 *
 * **This is the cheapest insurance in the whole block.** A webhook that never
 * arrived is the kind of bug that bills people wrongly for weeks without anyone
 * noticing: nothing throws, no log goes red, the app just quietly believes the
 * wrong thing. The only way to see it is to ask the provider what it thinks and
 * compare — and a number that should always be zero is the easiest alert there is.
 *
 * It **reports, it does not repair**. Auto-healing from a comparison is how you
 * turn one missed webhook into a wrong charge: a human looks, and the failed event
 * gets replayed from the journal.
 */
@Injectable()
export class ReconcileSubscriptions {
    constructor(
        private readonly subscriptions: SubscriptionRepository,
        private readonly plans: PlanRepository,
        private readonly prices: PlanPriceRepository,
        private readonly gateways: GatewayProvider,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(ReconcileSubscriptions.name)
    }

    async run(): Promise<GatewayDrift[]> {
        const drifts: GatewayDrift[] = []

        for (const gateway of this.gateways.available()) {
            drifts.push(await this.reconcile(gateway.name))
        }

        return drifts
    }

    private async reconcile(name: PaymentGateway): Promise<GatewayDrift> {
        const gateway = this.gateways.get(name)

        // PayPal can only list subscriptions per plan, so it needs the catalog we
        // published there. Stripe ignores it.
        const planIds = (await this.plans.findAll()).map((plan) => plan.id)
        const publishedPlans = (await this.prices.findByPlans(planIds))
            .map((price) => price.externalIdOn(name))
            .filter((id): id is string => id !== null)

        const remote = await gateway.listLiveSubscriptionIds(publishedPlans)
        if (remote === null) {
            // No signal. Reporting zero drift here would be a lie that silences the alert.
            return { gateway: name, missingLocally: [], staleLocally: [], total: null }
        }

        const local = await this.subscriptions.findLiveByGateway(name)
        const localIds = new Set(local.map((subscription) => subscription.gatewaySubscriptionId).filter(Boolean))
        const remoteIds = new Set(remote)

        const missingLocally = remote.filter((id) => !localIds.has(id))
        const staleLocally = [...localIds].filter((id): id is string => id !== null && !remoteIds.has(id))

        const drift: GatewayDrift = {
            gateway: name,
            missingLocally,
            staleLocally,
            total: missingLocally.length + staleLocally.length,
        }

        if (drift.total && drift.total > 0) {
            // The ids are the provider's, not the user's — safe to log, and the only
            // thing that makes the report actionable.
            this.logger.error(
                { gateway: name, missingLocally: missingLocally.slice(0, 20), staleLocally: staleLocally.slice(0, 20) },
                'billing drift: our books and the gateway disagree',
            )
        }

        return drift
    }
}
