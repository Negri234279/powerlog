import { Injectable, Logger } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Counter } from 'prom-client'

import { Mailer } from '../../../../mail/mailer.port'
import { METRIC } from '../../../../observability/metrics'
import { NotificationEntity, type NotificationData } from '../../domain/entities/notification.entity'
import type { NotificationType } from '../../domain/notification-type'
import { NotificationRepository } from '../../domain/repositories/notification.repository'
import { Clock } from '../ports/clock.port'
import { IdGenerator } from '../ports/id-generator.port'

/** A notification to create plus an optional email to send for it. */
export interface NotificationInput {
    userId: string
    type: NotificationType
    data: NotificationData
    /** When present, an email is sent best-effort after persisting the bell entry. */
    email?: {
        to: string
        subject: string
        html: string
        text: string
    }
}

/**
 * Creates an in-app notification and, when an email is supplied, sends it
 * best-effort (a mail outage is logged, never propagated — the bell entry is the
 * source of truth). Used by the integration-event handlers.
 */
@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name)

    constructor(
        private readonly notifications: NotificationRepository,
        private readonly ids: IdGenerator,
        private readonly clock: Clock,
        private readonly mailer: Mailer,
        @InjectMetric(METRIC.notificationsCreated) private readonly created: Counter<string>,
    ) {}

    async create(input: NotificationInput): Promise<NotificationEntity> {
        const notification = NotificationEntity.create({
            id: this.ids.uuid(),
            userId: input.userId,
            type: input.type,
            data: input.data,
            now: this.clock.now(),
        })
        await this.notifications.create(notification)
        this.created.inc({ type: input.type })
        this.logger.log(`notification created for user ${input.userId} (${input.type})`)

        if (input.email) {
            try {
                await this.mailer.send({
                    to: input.email.to,
                    subject: input.email.subject,
                    html: input.email.html,
                    text: input.email.text,
                    tag: input.type,
                })
            } catch (err) {
                this.logger.error(`Failed to send ${input.type} email for user ${input.userId}: ${String(err)}`)
            }
        }
        return notification
    }
}
