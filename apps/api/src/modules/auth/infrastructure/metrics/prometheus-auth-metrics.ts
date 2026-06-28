import { Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Counter } from 'prom-client'

import { METRIC } from '../../../../observability/metrics'
import { AuthMetrics } from '../../application/ports/auth-metrics.port'
import type {
    LoginMethod,
    LoginOutcome,
    RefreshOutcome,
    RegistrationMethod,
} from '../../application/ports/auth-metrics.port'

/** Prometheus-backed AuthMetrics adapter. Counters declared in observability/metrics. */
@Injectable()
export class PrometheusAuthMetrics extends AuthMetrics {
    constructor(
        @InjectMetric(METRIC.authLogins) private readonly logins: Counter<string>,
        @InjectMetric(METRIC.authRefresh) private readonly refresh: Counter<string>,
        @InjectMetric(METRIC.authRegistrations) private readonly registrations: Counter<string>,
    ) {
        super()
    }

    recordLogin(method: LoginMethod, outcome: LoginOutcome): void {
        this.logins.inc({ method, status: outcome })
    }

    recordRefresh(outcome: RefreshOutcome): void {
        this.refresh.inc({ status: outcome })
    }

    recordRegistration(method: RegistrationMethod): void {
        this.registrations.inc({ method })
    }
}
