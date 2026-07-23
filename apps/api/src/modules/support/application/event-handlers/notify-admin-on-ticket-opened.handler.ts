import { ConfigService } from '@nestjs/config'
import { EventsHandler, type IEventHandler } from '@nestjs/cqrs'
import { PinoLogger } from 'nestjs-pino'

import type { Env } from '../../../../config/env'
import { Mailer } from '../../../../mail/mailer.port'
import { SupportTicketOpenedIntegrationEvent } from '../events/support-ticket-opened.integration-event'

/** Minimal HTML escaping for user-supplied content dropped into the email body. */
function escapeHtml(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Emails the support inbox (`CONTACT_TO`) when a ticket is opened. Best-effort: the
 * ticket is already persisted, so a mail failure is logged and swallowed, never
 * surfaced to the person who wrote in. `replyTo` is the sender so a reply from the
 * inbox reaches them. The send itself is counted by MeteredMailer as type=contact.
 */
@EventsHandler(SupportTicketOpenedIntegrationEvent)
export class NotifyAdminOnTicketOpened implements IEventHandler<SupportTicketOpenedIntegrationEvent> {
    constructor(
        private readonly mailer: Mailer,
        private readonly config: ConfigService<Env, true>,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(NotifyAdminOnTicketOpened.name)
    }

    async handle(event: SupportTicketOpenedIntegrationEvent): Promise<void> {
        const to = this.config.get('CONTACT_TO', { infer: true })
        if (!to) {
            this.logger.debug({ ticketId: event.ticketId }, 'CONTACT_TO unset — skipping admin notification')
            return
        }

        const from = event.requesterName ? `${event.requesterName} <${event.requesterEmail}>` : event.requesterEmail
        const linked = event.requesterUserId ? `Linked user: ${event.requesterUserId}` : 'No linked account'

        const html = [
            `<p><strong>New ${escapeHtml(event.category)} ticket</strong></p>`,
            `<p><strong>Subject:</strong> ${escapeHtml(event.subject)}</p>`,
            `<p><strong>From:</strong> ${escapeHtml(from)}<br/>${escapeHtml(linked)}</p>`,
            `<hr/>`,
            `<p style="white-space:pre-wrap">${escapeHtml(event.messageBody)}</p>`,
        ].join('')

        const text = [
            `New ${event.category} ticket`,
            `Subject: ${event.subject}`,
            `From: ${from}`,
            linked,
            '',
            event.messageBody,
        ].join('\n')

        try {
            await this.mailer.send({
                to,
                subject: `[support] ${event.subject}`,
                html,
                text,
                replyTo: event.requesterEmail,
                tag: 'contact',
            })
        } catch (err) {
            this.logger.error({ ticketId: event.ticketId, err }, 'contact notification email failed')
        }
    }
}
