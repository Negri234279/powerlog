import { Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Counter } from 'prom-client'

import { METRIC } from '../../../../observability/metrics'
import { CoachingMetrics } from '../../application/ports/coaching-metrics.port'
import type { InvitationOutcome, Invitee, UnlinkedBy } from '../../application/ports/coaching-metrics.port'

/** Prometheus-backed CoachingMetrics adapter. Counters declared in observability/metrics. */
@Injectable()
export class PrometheusCoachingMetrics extends CoachingMetrics {
    constructor(
        @InjectMetric(METRIC.coachInvitations) private readonly invitations: Counter<string>,
        @InjectMetric(METRIC.coachLinksRemoved) private readonly linksRemoved: Counter<string>,
    ) {
        super()
    }

    recordInvitation(outcome: InvitationOutcome, invitee: Invitee): void {
        this.invitations.inc({ status: outcome, invitee })
    }

    recordLinkRemoved(by: UnlinkedBy): void {
        this.linksRemoved.inc({ by })
    }
}
