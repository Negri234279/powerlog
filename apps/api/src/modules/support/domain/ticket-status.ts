/** Lifecycle of a support ticket. `open` on creation; an admin may `close`/reopen. */
export const TICKET_STATUSES = ['open', 'closed'] as const

export type TicketStatus = (typeof TICKET_STATUSES)[number]
