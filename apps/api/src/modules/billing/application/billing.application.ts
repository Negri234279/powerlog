import { AddPlanPriceHandler } from './commands/add-plan-price/add-plan-price.handler'
import { AssignSubscriptionHandler } from './commands/assign-subscription/assign-subscription.handler'
import { CreatePlanHandler } from './commands/create-plan/create-plan.handler'
import { DeactivatePlanPriceHandler } from './commands/deactivate-plan-price/deactivate-plan-price.handler'
import { HandleGatewayEventHandler } from './commands/handle-gateway-event/handle-gateway-event.handler'
import {
    CancelSubscriptionHandler,
    ChangePlanHandler,
    ResumeSubscriptionHandler,
} from './commands/manage-subscription/manage-subscription.handlers'
import { RevokeSubscriptionHandler } from './commands/revoke-subscription/revoke-subscription.handler'
import { SetPlanStatusHandler } from './commands/set-plan-status/set-plan-status.handler'
import { StartCheckoutHandler } from './commands/start-checkout/start-checkout.handler'
import { SyncPlanHandler } from './commands/sync-plan/sync-plan.handler'
import { UpdatePlanHandler } from './commands/update-plan/update-plan.handler'
import { UpsertPlanOfferHandler } from './commands/upsert-plan-offer/upsert-plan-offer.handler'
import { RetryWebhookEventHandler } from './commands/retry-webhook-event/retry-webhook-event.handler'
import { AdminBillingStatsHandler } from './queries/admin-billing-stats/admin-billing-stats.handler'
import {
    AdminBillingDriftHandler,
    AdminGatewayStatusHandler,
    AdminWebhookEventsHandler,
} from './queries/admin-gateways/admin-gateways.handlers'
import { AdminPlansHandler } from './queries/admin-plans/admin-plans.handler'
import { AdminSubscriptionsHandler } from './queries/admin-subscriptions/admin-subscriptions.handler'
import { GetUserEntitlementsHandler } from './queries/get-user-entitlements/get-user-entitlements.handler'
import {
    AvailablePlansHandler,
    BillingPortalUrlHandler,
    MyInvoicesHandler,
    MySubscriptionHandler,
} from './queries/my-billing/my-billing.handlers'

/** CQRS command handlers for the billing module. */
export const BILLING_COMMAND_HANDLERS = [
    CreatePlanHandler,
    UpdatePlanHandler,
    SetPlanStatusHandler,
    AddPlanPriceHandler,
    DeactivatePlanPriceHandler,
    AssignSubscriptionHandler,
    RevokeSubscriptionHandler,
    UpsertPlanOfferHandler,
    SyncPlanHandler,
    StartCheckoutHandler,
    CancelSubscriptionHandler,
    ResumeSubscriptionHandler,
    ChangePlanHandler,
    HandleGatewayEventHandler,
    RetryWebhookEventHandler,
]

/** CQRS query handlers for the billing module. */
export const BILLING_QUERY_HANDLERS = [
    GetUserEntitlementsHandler,
    AdminPlansHandler,
    AdminSubscriptionsHandler,
    AdminBillingStatsHandler,
    AvailablePlansHandler,
    MySubscriptionHandler,
    MyInvoicesHandler,
    BillingPortalUrlHandler,
    AdminGatewayStatusHandler,
    AdminWebhookEventsHandler,
    AdminBillingDriftHandler,
]
