import { UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql'
import { z } from 'zod'

import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { type EntitlementsSnapshot, Entitlements, type PlanAudience } from '../../../../shared/contracts/entitlements'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import {
    CancelSubscriptionCommand,
    ChangePlanCommand,
    ResumeSubscriptionCommand,
} from '../../application/commands/manage-subscription/manage-subscription.commands'
import { StartCheckoutCommand } from '../../application/commands/start-checkout/start-checkout.command'
import type {
    MyInvoiceView,
    MySubscriptionView,
    PublicPlanView,
} from '../../application/queries/my-billing/my-billing.handlers'
import {
    AvailablePlansQuery,
    BillingPortalUrlQuery,
    MyInvoicesQuery,
    MySubscriptionQuery,
} from '../../application/queries/my-billing/my-billing.queries'
import type { PaymentGateway } from '../../domain/entities/subscription.entity'
import { toSupportedLocale } from '../../../../shared/i18n/locale'
import { MyEntitlementsType, MyInvoicePageType, MySubscriptionType, PublicPlanType } from '../types/billing.types'

const audienceArg = z.enum(['athlete', 'coach'])
const gatewayArg = z.enum(['stripe', 'paypal'])
const uuidArg = z.string().uuid()
const optionalUuid = uuidArg.nullish().transform((value) => value ?? null)
const limitArg = z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .nullish()
    .transform((value) => value ?? 10)
const offsetArg = z.coerce
    .number()
    .int()
    .min(0)
    .nullish()
    .transform((value) => value ?? 0)

/**
 * What a subscriber can see and do about their own plan.
 *
 * The mutations that touch money return **nothing but a URL or a boolean**: they
 * ask the gateway, and the local state changes when the webhook confirms it. So
 * the client must not treat a successful mutation as "it happened" — it re-reads
 * (and the realtime event tells it when to).
 */
@Resolver()
export class BillingResolver {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly entitlements: Entitlements,
    ) {}

    @Query(() => [PublicPlanType], { description: 'The plans on sale for an audience. Public — no session needed.' })
    async availablePlans(
        @Args('audience', { type: () => String }, new ZodValidationPipe(audienceArg)) audience: PlanAudience,
        // Public page, so no session to read a locale from: the web sends the one it
        // renders in. Any unsupported/absent tag falls back to the base (English).
        @Args('locale', { type: () => String, nullable: true }) locale: string | null,
    ): Promise<PublicPlanView[]> {
        const query = new AvailablePlansQuery(audience, toSupportedLocale(locale))

        return this.queryBus.execute<AvailablePlansQuery, PublicPlanView[]>(query)
    }

    @Query(() => MyEntitlementsType, {
        description: 'What your plan includes. For the UI only — the server is the authority on every gate.',
    })
    @UseGuards(JwtCookieGuard)
    async myEntitlements(@CurrentUser() user: AuthUser): Promise<EntitlementsSnapshot> {
        return this.entitlements.forUser(user.userId)
    }

    @Query(() => MySubscriptionType, {
        nullable: true,
        description: 'Your subscription, or null when you are on the free plan.',
    })
    @UseGuards(JwtCookieGuard)
    async mySubscription(@CurrentUser() user: AuthUser): Promise<MySubscriptionView | null> {
        const query = new MySubscriptionQuery(user.userId)

        return this.queryBus.execute<MySubscriptionQuery, MySubscriptionView | null>(query)
    }

    @Query(() => MyInvoicePageType, { description: 'Your billing history, as the gateway issued it.' })
    @UseGuards(JwtCookieGuard)
    async myInvoices(
        @CurrentUser() user: AuthUser,
        @Args('limit', { type: () => Int, nullable: true }, new ZodValidationPipe(limitArg)) limit: number,
        @Args('offset', { type: () => Int, nullable: true }, new ZodValidationPipe(offsetArg)) offset: number,
    ): Promise<{ rows: MyInvoiceView[]; total: number }> {
        const query = new MyInvoicesQuery(user.userId, limit, offset)

        return this.queryBus.execute<MyInvoicesQuery, { rows: MyInvoiceView[]; total: number }>(query)
    }

    @Query(() => String, {
        nullable: true,
        description: 'The gateway’s billing portal (card, invoices). Null when there is none — the button hides.',
    })
    @UseGuards(JwtCookieGuard)
    async billingPortalUrl(@CurrentUser() user: AuthUser): Promise<string | null> {
        const query = new BillingPortalUrlQuery(user.userId)

        return this.queryBus.execute<BillingPortalUrlQuery, string | null>(query)
    }

    @Mutation(() => String, {
        description:
            'Start paying for a plan. Returns the URL to send the browser to; the subscription is created by the webhook, not by the redirect.',
    })
    @UseGuards(JwtCookieGuard)
    async startCheckout(
        @CurrentUser() user: AuthUser,
        @Args('planPriceId', { type: () => ID }, new ZodValidationPipe(uuidArg)) planPriceId: string,
        @Args('gateway', { type: () => String }, new ZodValidationPipe(gatewayArg)) gateway: PaymentGateway,
        @Args('offerId', { type: () => ID, nullable: true }, new ZodValidationPipe(optionalUuid))
        offerId: string | null,
    ): Promise<string> {
        const command = new StartCheckoutCommand(user.userId, planPriceId, gateway, offerId)

        return this.commandBus.execute<StartCheckoutCommand, string>(command)
    }

    @Mutation(() => Boolean, {
        description: 'Stop the subscription renewing. You keep the plan until the period you paid for ends.',
    })
    @UseGuards(JwtCookieGuard)
    async cancelSubscription(@CurrentUser() user: AuthUser): Promise<boolean> {
        const command = new CancelSubscriptionCommand(user.userId)
        await this.commandBus.execute<CancelSubscriptionCommand, void>(command)

        return true
    }

    @Mutation(() => Boolean, { description: 'Undo a scheduled cancellation, while the paid period is still running.' })
    @UseGuards(JwtCookieGuard)
    async resumeSubscription(@CurrentUser() user: AuthUser): Promise<boolean> {
        const command = new ResumeSubscriptionCommand(user.userId)
        await this.commandBus.execute<ResumeSubscriptionCommand, void>(command)

        return true
    }

    @Mutation(() => String, {
        nullable: true,
        description:
            'Move to another plan. An upgrade is charged now, pro-rated; a downgrade lands when the period you paid for ends. Returns a URL when the provider needs you to approve it again (PayPal), null when it just applied it (Stripe).',
    })
    @UseGuards(JwtCookieGuard)
    async changePlan(
        @CurrentUser() user: AuthUser,
        @Args('planPriceId', { type: () => ID }, new ZodValidationPipe(uuidArg)) planPriceId: string,
    ): Promise<string | null> {
        const command = new ChangePlanCommand(user.userId, planPriceId)

        return this.commandBus.execute<ChangePlanCommand, string | null>(command)
    }
}
