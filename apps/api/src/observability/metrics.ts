import { makeCounterProvider, makeGaugeProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus'

/** Names of the custom metrics exposed at /metrics. */
export const METRIC = {
    commandDuration: 'cqrs_command_duration_seconds',
    queryDuration: 'cqrs_query_duration_seconds',
    eventsTotal: 'cqrs_events_total',
    httpDuration: 'http_request_duration_seconds',
    domainErrors: 'domain_errors_total',
    buildInfo: 'powerlog_build_info',
    emailsSent: 'powerlog_emails_sent_total',
    emailSendDuration: 'powerlog_email_send_duration_seconds',
    emailEvents: 'powerlog_email_events_total',
    resendApiUp: 'powerlog_resend_api_up',
    resendDomainVerified: 'powerlog_resend_domain_verified',
    avatarsProcessed: 'powerlog_avatars_processed_total',
    r2OperationDuration: 'powerlog_r2_operation_duration_seconds',
    r2BytesUploaded: 'powerlog_r2_bytes_uploaded_total',
    r2Up: 'powerlog_r2_up',
    r2ProbeDuration: 'powerlog_r2_probe_seconds',
    notificationsCreated: 'powerlog_notifications_created_total',
    authLogins: 'powerlog_auth_logins_total',
    authRefresh: 'powerlog_auth_refresh_total',
    authRegistrations: 'powerlog_auth_registrations_total',
    pgPoolConnections: 'powerlog_pg_pool_connections',
    pgPoolMax: 'powerlog_pg_pool_max',
} as const

// Latency buckets in seconds (web/API request + DB call range).
const DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]

/** Prometheus metric providers, registered on the default registry. */
export const metricsProviders = [
    makeHistogramProvider({
        name: METRIC.commandDuration,
        help: 'Duration of CQRS command execution in seconds.',
        labelNames: ['command', 'status'],
        buckets: DURATION_BUCKETS,
        // Attach the trace_id of the slow call as an exemplar (OpenMetrics).
        enableExemplars: true,
    }),
    makeHistogramProvider({
        name: METRIC.queryDuration,
        help: 'Duration of CQRS query execution in seconds.',
        labelNames: ['query', 'status'],
        buckets: DURATION_BUCKETS,
        enableExemplars: true,
    }),
    makeCounterProvider({
        name: METRIC.eventsTotal,
        help: 'Count of domain events published.',
        labelNames: ['event'],
    }),
    makeHistogramProvider({
        name: METRIC.httpDuration,
        help: 'Duration of inbound requests (HTTP routes + GraphQL operations).',
        labelNames: ['kind', 'operation', 'status'],
        buckets: DURATION_BUCKETS,
        enableExemplars: true,
    }),
    // Incremented by the global exception filter (Sub-block E).
    makeCounterProvider({
        name: METRIC.domainErrors,
        help: 'Count of errors surfaced to clients, by code.',
        labelNames: ['code', 'kind'],
    }),
    // Constant `1` gauge carrying the running version/service/environment as
    // labels (Prometheus build-info convention). Set by BuildInfoMetric.
    makeGaugeProvider({
        name: METRIC.buildInfo,
        help: 'Running build metadata (value is always 1; info is in the labels).',
        labelNames: ['version', 'service', 'environment'],
    }),
    // Business metrics. Labels stay low-cardinality (no userId/email/recipient).
    // Transactional emails, by purpose and outcome (set by MeteredMailer).
    makeCounterProvider({
        name: METRIC.emailsSent,
        help: 'Count of transactional emails dispatched, by type and outcome.',
        labelNames: ['type', 'status'],
    }),
    // Latency of the mail transport send call (Resend HTTP API / SMTP), by type
    // and outcome (set by MeteredMailer).
    makeHistogramProvider({
        name: METRIC.emailSendDuration,
        help: 'Duration of the mail transport send call in seconds.',
        labelNames: ['type', 'status'],
        buckets: DURATION_BUCKETS,
        enableExemplars: true,
    }),
    // Resend delivery webhook events (delivered/bounced/complained/opened/clicked/…)
    // by event and email type (set by ResendWebhookController). Deliverability the
    // send path can't see.
    makeCounterProvider({
        name: METRIC.emailEvents,
        help: 'Count of Resend webhook delivery events, by event and email type.',
        labelNames: ['event', 'type'],
    }),
    // Resend account health, polled via the API key (ResendDomainProbe).
    makeGaugeProvider({
        name: METRIC.resendApiUp,
        help: 'Resend API reachability via the API key: 1 = list domains OK, 0 = failing.',
    }),
    makeGaugeProvider({
        name: METRIC.resendDomainVerified,
        help: 'Sending domain verification: 1 = verified, 0 = not verified.',
        labelNames: ['domain'],
    }),
    // Avatar ingests (process → store), by source and outcome (set by AvatarIngestor).
    makeCounterProvider({
        name: METRIC.avatarsProcessed,
        help: 'Count of avatar ingestions, by source and outcome.',
        labelNames: ['source', 'status'],
    }),
    // Cloudflare R2 object-storage calls — latency by operation + outcome, and
    // bytes uploaded (set by R2AvatarStorage; only active when AVATAR_STORAGE=r2).
    makeHistogramProvider({
        name: METRIC.r2OperationDuration,
        help: 'Duration of Cloudflare R2 object-storage operations in seconds.',
        labelNames: ['operation', 'status'],
        buckets: DURATION_BUCKETS,
        enableExemplars: true,
    }),
    makeCounterProvider({
        name: METRIC.r2BytesUploaded,
        help: 'Total bytes uploaded to R2 (avatar PutObject).',
    }),
    // R2 bucket liveness, sampled by a periodic HeadBucket probe (R2HealthProbe).
    makeGaugeProvider({
        name: METRIC.r2Up,
        help: 'R2 bucket reachability: 1 = HeadBucket OK, 0 = failing.',
        labelNames: ['bucket'],
    }),
    makeGaugeProvider({
        name: METRIC.r2ProbeDuration,
        help: 'Duration of the last R2 HeadBucket health probe in seconds.',
        labelNames: ['bucket'],
    }),
    // In-app notifications created, by type (set by NotificationService).
    makeCounterProvider({
        name: METRIC.notificationsCreated,
        help: 'Count of in-app notifications created, by type.',
        labelNames: ['type'],
    }),
    // Auth signals. method/status stay bounded enums (no userId/email).
    // Login attempts, by method and outcome (set by the auth handlers via AuthMetrics).
    makeCounterProvider({
        name: METRIC.authLogins,
        help: 'Count of login attempts, by method and outcome.',
        labelNames: ['method', 'status'],
    }),
    // Refresh-token rotations, by outcome. `reuse_detected` is a security signal
    // (a revoked token was replayed → the whole family is revoked).
    makeCounterProvider({
        name: METRIC.authRefresh,
        help: 'Count of refresh-session outcomes (rotated/reuse_detected/invalid).',
        labelNames: ['status'],
    }),
    // New account registrations, by method (set on UserRegisteredIntegrationEvent).
    makeCounterProvider({
        name: METRIC.authRegistrations,
        help: 'Count of new account registrations, by method.',
        labelNames: ['method'],
    }),
    // pg connection pool, sampled at scrape time (set by PgPoolMetrics).
    // `waiting > 0` = the app is queuing for a connection (pool saturated).
    makeGaugeProvider({
        name: METRIC.pgPoolConnections,
        help: 'pg connection pool size by state (total/idle/waiting), sampled at scrape time.',
        labelNames: ['state'],
    }),
    makeGaugeProvider({
        name: METRIC.pgPoolMax,
        help: 'Configured maximum size of the pg connection pool.',
    }),
]
