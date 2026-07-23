import { SubmitContactMessageHandler } from './commands/submit-contact-message/submit-contact-message.handler'
import { NotifyAdminOnTicketOpened } from './event-handlers/notify-admin-on-ticket-opened.handler'

/** CQRS command handlers for the support module. */
export const SUPPORT_COMMAND_HANDLERS = [SubmitContactMessageHandler]

/** CQRS query handlers for the support module (admin listing/detail — Block 2.2). */
export const SUPPORT_QUERY_HANDLERS = []

/** Integration-event handlers (react to events on the bus). */
export const SUPPORT_EVENT_HANDLERS = [NotifyAdminOnTicketOpened]
