/**
 * Support ticket categories — the single source of truth, shared by the domain,
 * the Drizzle enum and the GraphQL enum. Adding one is a line here + a migration.
 */
export const TICKET_CATEGORIES = ['general', 'billing', 'bug', 'account', 'feature', 'other'] as const

export type TicketCategory = (typeof TICKET_CATEGORIES)[number]
