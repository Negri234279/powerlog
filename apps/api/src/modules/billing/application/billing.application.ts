import { GetUserEntitlementsHandler } from './queries/get-user-entitlements/get-user-entitlements.handler'

/** CQRS query handlers for the billing module. */
export const BILLING_QUERY_HANDLERS = [GetUserEntitlementsHandler]
