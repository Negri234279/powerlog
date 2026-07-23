import { SetTicketStatusHandler } from './commands/set-ticket-status/set-ticket-status.handler'
import { SubmitContactMessageHandler } from './commands/submit-contact-message/submit-contact-message.handler'
import { NotifyAdminOnTicketOpened } from './event-handlers/notify-admin-on-ticket-opened.handler'
import { AdminSupportTicketHandler } from './queries/admin-support-ticket/admin-support-ticket.handler'
import { AdminSupportTicketsHandler } from './queries/admin-support-tickets/admin-support-tickets.handler'

/** CQRS command handlers for the support module. */
export const SUPPORT_COMMAND_HANDLERS = [SubmitContactMessageHandler, SetTicketStatusHandler]

/** CQRS query handlers for the support module. */
export const SUPPORT_QUERY_HANDLERS = [AdminSupportTicketsHandler, AdminSupportTicketHandler]

/** Integration-event handlers (react to events on the bus). */
export const SUPPORT_EVENT_HANDLERS = [NotifyAdminOnTicketOpened]
