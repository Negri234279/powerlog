import { MarkAllNotificationsReadHandler } from './commands/mark-all-notifications-read/mark-all-notifications-read.handler'
import { MarkNotificationReadHandler } from './commands/mark-notification-read/mark-notification-read.handler'
import { NotifyOnCoachInvitationCreated } from './event-handlers/notify-on-coach-invitation-created.handler'
import { NotifyOnCoachLinkEstablished } from './event-handlers/notify-on-coach-link-established.handler'
import { CountUnreadNotificationsHandler } from './queries/count-unread-notifications/count-unread-notifications.handler'
import { ListNotificationsHandler } from './queries/list-notifications/list-notifications.handler'
import { NotificationService } from './services/notification.service'

/** CQRS command handlers for the notifications module. */
export const NOTIFICATIONS_COMMAND_HANDLERS = [MarkNotificationReadHandler, MarkAllNotificationsReadHandler]

/** CQRS query handlers for the notifications module. */
export const NOTIFICATIONS_QUERY_HANDLERS = [ListNotificationsHandler, CountUnreadNotificationsHandler]

/** Integration-event handlers (react to events on the bus). */
export const NOTIFICATIONS_EVENT_HANDLERS = [NotifyOnCoachInvitationCreated, NotifyOnCoachLinkEstablished]

/** Application-layer services (not CQRS handlers). */
export const NOTIFICATIONS_APPLICATION_SERVICES = [NotificationService]
