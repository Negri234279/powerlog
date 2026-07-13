import { AddPlanPriceHandler } from './commands/add-plan-price/add-plan-price.handler'
import { AssignSubscriptionHandler } from './commands/assign-subscription/assign-subscription.handler'
import { CreatePlanHandler } from './commands/create-plan/create-plan.handler'
import { DeactivatePlanPriceHandler } from './commands/deactivate-plan-price/deactivate-plan-price.handler'
import { RevokeSubscriptionHandler } from './commands/revoke-subscription/revoke-subscription.handler'
import { SetPlanStatusHandler } from './commands/set-plan-status/set-plan-status.handler'
import { UpdatePlanHandler } from './commands/update-plan/update-plan.handler'
import { AdminBillingStatsHandler } from './queries/admin-billing-stats/admin-billing-stats.handler'
import { AdminPlansHandler } from './queries/admin-plans/admin-plans.handler'
import { AdminSubscriptionsHandler } from './queries/admin-subscriptions/admin-subscriptions.handler'
import { GetUserEntitlementsHandler } from './queries/get-user-entitlements/get-user-entitlements.handler'

/** CQRS command handlers for the billing module. */
export const BILLING_COMMAND_HANDLERS = [
    CreatePlanHandler,
    UpdatePlanHandler,
    SetPlanStatusHandler,
    AddPlanPriceHandler,
    DeactivatePlanPriceHandler,
    AssignSubscriptionHandler,
    RevokeSubscriptionHandler,
]

/** CQRS query handlers for the billing module. */
export const BILLING_QUERY_HANDLERS = [
    GetUserEntitlementsHandler,
    AdminPlansHandler,
    AdminSubscriptionsHandler,
    AdminBillingStatsHandler,
]
