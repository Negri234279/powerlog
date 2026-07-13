import { UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql'

import { AdminGuard } from '../../../../auth/admin.guard'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { JsonValue } from '../../../../graphql/json.scalar'
import type { PlanAudience } from '../../../../shared/contracts/entitlements'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import { AddPlanPriceCommand } from '../../application/commands/add-plan-price/add-plan-price.command'
import { AssignSubscriptionCommand } from '../../application/commands/assign-subscription/assign-subscription.command'
import { CreatePlanCommand } from '../../application/commands/create-plan/create-plan.command'
import { DeactivatePlanPriceCommand } from '../../application/commands/deactivate-plan-price/deactivate-plan-price.command'
import { RevokeSubscriptionCommand } from '../../application/commands/revoke-subscription/revoke-subscription.command'
import { SetPlanStatusCommand } from '../../application/commands/set-plan-status/set-plan-status.command'
import { SyncPlanCommand } from '../../application/commands/sync-plan/sync-plan.command'
import { UpdatePlanCommand } from '../../application/commands/update-plan/update-plan.command'
import { UpsertPlanOfferCommand } from '../../application/commands/upsert-plan-offer/upsert-plan-offer.command'
import type { AdminBillingStats } from '../../application/ports/admin-billing-stats.read-model'
import { RetryWebhookEventCommand } from '../../application/commands/retry-webhook-event/retry-webhook-event.command'
import type { WebhookEventStatus } from '../../application/ports/webhook-event.store'
import { AdminBillingStatsQuery } from '../../application/queries/admin-billing-stats/admin-billing-stats.query'
import type {
    AdminWebhookEventView,
    GatewayStatusView,
} from '../../application/queries/admin-gateways/admin-gateways.handlers'
import {
    AdminBillingDriftQuery,
    AdminGatewayStatusQuery,
    AdminWebhookEventsQuery,
} from '../../application/queries/admin-gateways/admin-gateways.queries'
import type { GatewayDrift } from '../../application/services/reconcile-subscriptions.service'
import type { AdminPlanView } from '../../application/queries/admin-plans/admin-plans.handler'
import { AdminPlansQuery } from '../../application/queries/admin-plans/admin-plans.query'
import type { AdminSubscriptionsPageView } from '../../application/queries/admin-subscriptions/admin-subscriptions.handler'
import { AdminSubscriptionsQuery } from '../../application/queries/admin-subscriptions/admin-subscriptions.query'
import type { PlanStatus } from '../../domain/entities/plan.entity'
import type { PaymentGateway } from '../../domain/entities/subscription.entity'
import type { Currency, PlanInterval } from '../../domain/plan-interval'
import type { SubscriptionStatus } from '../../domain/subscription-status'
import { entitlementsJsonSchema } from '../../domain/value-objects/plan-entitlements'
import {
    AddPlanPriceInput,
    AssignSubscriptionInput,
    CreatePlanInput,
    UpdatePlanInput,
    UpsertPlanOfferInput,
    addPlanPriceSchema,
    assignSubscriptionSchema,
    audienceArg,
    createPlanSchema,
    gatewayArg,
    gatewayArgRequired,
    idArg,
    limitArg,
    offsetArg,
    planStatusArg,
    searchArg,
    statusArg,
    webhookStatusArg,
    updatePlanSchema,
    upsertPlanOfferSchema,
    uuidArg,
} from '../inputs/admin-billing.inputs'
import { AdminBillingStatsType } from '../types/admin-billing-stats.type'
import { BillingDriftType, BillingWebhookEventPageType, GatewayStatusType } from '../types/admin-gateway.type'
import { AdminPlanType } from '../types/admin-plan.type'
import { AdminSubscriptionPageType } from '../types/admin-subscription-page.type'

const DEFAULT_LIMIT = 25

/**
 * Admin-only billing: the catalog, the subscriptions on it, and the figures they
 * add up to. The gateways know nothing about this — syncing the catalog to Stripe
 * and PayPal is 9.3/9.4.
 */
@Resolver(() => AdminPlanType)
@UseGuards(JwtCookieGuard, AdminGuard)
export class AdminBillingResolver {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Query(() => [AdminPlanType], { description: 'The whole catalog, any status (admin only).' })
    async adminPlans(
        @Args('audience', { type: () => String, nullable: true }, new ZodValidationPipe(audienceArg))
        audience?: PlanAudience,
    ): Promise<AdminPlanView[]> {
        const query = new AdminPlansQuery(audience)

        return this.queryBus.execute<AdminPlansQuery, AdminPlanView[]>(query)
    }

    @Query(() => JsonValue, {
        description:
            'JSON Schema of the entitlements an audience accepts — the admin form renders itself from this, so adding a feature needs no UI change.',
    })
    adminPlanEntitlementsSchema(
        @Args('audience', { type: () => String }, new ZodValidationPipe(audienceArg)) audience: PlanAudience,
    ): unknown {
        return entitlementsJsonSchema(audience)
    }

    @Query(() => AdminBillingStatsType, { description: 'Aggregate billing figures (admin only).' })
    async adminBillingStats(): Promise<AdminBillingStats> {
        const query = new AdminBillingStatsQuery()

        return this.queryBus.execute<AdminBillingStatsQuery, AdminBillingStats>(query)
    }

    @Query(() => AdminSubscriptionPageType, {
        description: 'Subscriptions, filterable by status/gateway/plan and by exact email or handle.',
    })
    async adminSubscriptions(
        @Args('status', { type: () => String, nullable: true }, new ZodValidationPipe(statusArg))
        status?: SubscriptionStatus,
        @Args('gateway', { type: () => String, nullable: true }, new ZodValidationPipe(gatewayArg))
        gateway?: PaymentGateway,
        @Args('planId', { type: () => ID, nullable: true }, new ZodValidationPipe(idArg)) planId?: string,
        @Args('search', { type: () => String, nullable: true }, new ZodValidationPipe(searchArg)) search?: string,
        @Args('limit', { type: () => Int, nullable: true }, new ZodValidationPipe(limitArg)) limit?: number,
        @Args('offset', { type: () => Int, nullable: true }, new ZodValidationPipe(offsetArg)) offset?: number,
    ): Promise<AdminSubscriptionsPageView> {
        const query = new AdminSubscriptionsQuery(
            { status, gateway, planId, search },
            limit ?? DEFAULT_LIMIT,
            offset ?? 0,
        )

        return this.queryBus.execute<AdminSubscriptionsQuery, AdminSubscriptionsPageView>(query)
    }

    @Query(() => [GatewayStatusType], {
        description:
            'Health of each payment integration: configured, catalog published, when the last webhook arrived, how many failed.',
    })
    async adminGatewayStatus(): Promise<GatewayStatusView[]> {
        const query = new AdminGatewayStatusQuery()

        return this.queryBus.execute<AdminGatewayStatusQuery, GatewayStatusView[]>(query)
    }

    @Query(() => BillingWebhookEventPageType, { description: 'The webhook journal — what came in and what failed.' })
    async adminWebhookEvents(
        @Args('status', { type: () => String, nullable: true }, new ZodValidationPipe(webhookStatusArg))
        status?: WebhookEventStatus,
        @Args('gateway', { type: () => String, nullable: true }, new ZodValidationPipe(gatewayArg))
        gateway?: PaymentGateway,
        @Args('limit', { type: () => Int, nullable: true }, new ZodValidationPipe(limitArg)) limit?: number,
        @Args('offset', { type: () => Int, nullable: true }, new ZodValidationPipe(offsetArg)) offset?: number,
    ): Promise<{ rows: AdminWebhookEventView[]; total: number }> {
        const query = new AdminWebhookEventsQuery(status, gateway, limit ?? DEFAULT_LIMIT, offset ?? 0)

        return this.queryBus.execute<AdminWebhookEventsQuery, { rows: AdminWebhookEventView[]; total: number }>(query)
    }

    @Query(() => [BillingDriftType], {
        description:
            'Compare our subscriptions with each gateway now. Should be 0 — anything else is a webhook we never received.',
    })
    async adminBillingDrift(): Promise<GatewayDrift[]> {
        const query = new AdminBillingDriftQuery()

        return this.queryBus.execute<AdminBillingDriftQuery, GatewayDrift[]>(query)
    }

    @Mutation(() => Boolean, {
        description:
            'Re-process a webhook whose handler failed, from the payload the journal kept. It runs the same command the webhook does.',
    })
    async retryWebhookEvent(
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<boolean> {
        const command = new RetryWebhookEventCommand(id)
        await this.commandBus.execute<RetryWebhookEventCommand, void>(command)

        return true
    }

    @Mutation(() => ID, { description: 'Create a plan. Born `draft` unless told otherwise.' })
    async createPlan(@Args('input', new ZodValidationPipe(createPlanSchema)) input: CreatePlanInput): Promise<string> {
        const command = new CreatePlanCommand(
            input.audience as PlanAudience,
            input.slug,
            input.name,
            input.description ?? null,
            input.entitlements,
            (input.status as PlanStatus | null) ?? 'draft',
            input.isFree ?? false,
            input.sortOrder ?? 0,
        )

        return this.commandBus.execute<CreatePlanCommand, string>(command)
    }

    @Mutation(() => Boolean, {
        description: 'Edit a plan. Entitlement changes are retroactive: live subscribers see them at once.',
    })
    async updatePlan(@Args('input', new ZodValidationPipe(updatePlanSchema)) input: UpdatePlanInput): Promise<boolean> {
        // A patch: an absent field is left alone. `description` is the one where an
        // explicit null is meaningful — it clears it.
        const patch: { name?: string; description?: string | null; entitlements?: unknown; sortOrder?: number } = {}
        if (input.name != null) patch.name = input.name
        if (input.description !== undefined) patch.description = input.description
        if (input.entitlements !== undefined) patch.entitlements = input.entitlements
        if (input.sortOrder != null) patch.sortOrder = input.sortOrder

        const command = new UpdatePlanCommand(input.id, patch)
        await this.commandBus.execute<UpdatePlanCommand, void>(command)

        return true
    }

    @Mutation(() => Boolean, {
        description:
            'Publish, unpublish or archive a plan. Archiving stops new signups; the subscriptions already on it keep it.',
    })
    async setPlanStatus(
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
        @Args('status', { type: () => String }, new ZodValidationPipe(planStatusArg)) status: PlanStatus,
    ): Promise<boolean> {
        const command = new SetPlanStatusCommand(id, status)
        await this.commandBus.execute<SetPlanStatusCommand, void>(command)

        return true
    }

    @Mutation(() => ID, {
        description: 'Put a price on sale. The version currently on sale for that interval+currency is withdrawn.',
    })
    async addPlanPrice(
        @Args('input', new ZodValidationPipe(addPlanPriceSchema)) input: AddPlanPriceInput,
    ): Promise<string> {
        const command = new AddPlanPriceCommand(
            input.planId,
            input.interval as PlanInterval,
            input.currency as Currency,
            input.amountCents,
        )

        return this.commandBus.execute<AddPlanPriceCommand, string>(command)
    }

    @Mutation(() => Boolean, { description: 'Withdraw a price. Subscriptions on it keep running — they paid for it.' })
    async deactivatePlanPrice(
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<boolean> {
        const command = new DeactivatePlanPriceCommand(id)
        await this.commandBus.execute<DeactivatePlanPriceCommand, void>(command)

        return true
    }

    @Mutation(() => ID, {
        description:
            'Publish an offer on a plan (trial and/or a discounted opening phase). It replaces the plan’s live offer — terms are immutable, so a change is a new offer.',
    })
    async upsertPlanOffer(
        @Args('input', new ZodValidationPipe(upsertPlanOfferSchema)) input: UpsertPlanOfferInput,
    ): Promise<string> {
        const command = new UpsertPlanOfferCommand(
            input.planId,
            input.name,
            input.trialDays ?? null,
            input.introPhase ?? null,
            input.startsAt ?? new Date(),
            input.endsAt ?? null,
        )

        return this.commandBus.execute<UpsertPlanOfferCommand, string>(command)
    }

    @Mutation(() => Boolean, {
        description:
            'Publish the plan, its prices on sale and its offer to a payment gateway. Re-runnable — this is also the retry.',
    })
    async syncPlanToGateway(
        @Args('planId', { type: () => ID }, new ZodValidationPipe(uuidArg)) planId: string,
        @Args('gateway', { type: () => String }, new ZodValidationPipe(gatewayArgRequired)) gateway: PaymentGateway,
    ): Promise<boolean> {
        const command = new SyncPlanCommand(planId, gateway)
        await this.commandBus.execute<SyncPlanCommand, void>(command)

        return true
    }

    @Mutation(() => ID, { description: 'Put a user on a plan by hand (comp/support): no gateway, no charge.' })
    async adminAssignSubscription(
        @Args('input', new ZodValidationPipe(assignSubscriptionSchema)) input: AssignSubscriptionInput,
    ): Promise<string> {
        const command = new AssignSubscriptionCommand(input.userId, input.planId, input.until ?? null)

        return this.commandBus.execute<AssignSubscriptionCommand, string>(command)
    }

    @Mutation(() => Boolean, {
        description: 'End a manual grant now. Gateway-billed subscriptions must be ended at the gateway.',
    })
    async adminRevokeSubscription(
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<boolean> {
        const command = new RevokeSubscriptionCommand(id)
        await this.commandBus.execute<RevokeSubscriptionCommand, void>(command)

        return true
    }
}
