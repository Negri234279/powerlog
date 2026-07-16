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
    mesocycleStatusTransitions: 'powerlog_mesocycle_status_transitions_total',
    mesocycleSessionsGenerated: 'powerlog_mesocycle_sessions_generated_total',
    llmRequests: 'powerlog_llm_requests_total',
    llmRequestDuration: 'powerlog_llm_request_duration_seconds',
    llmTokens: 'powerlog_llm_tokens_total',
    authLogins: 'powerlog_auth_logins_total',
    authRefresh: 'powerlog_auth_refresh_total',
    authRegistrations: 'powerlog_auth_registrations_total',
    pgPoolConnections: 'powerlog_pg_pool_connections',
    pgPoolMax: 'powerlog_pg_pool_max',
    realtimeConnections: 'powerlog_realtime_connections',
    realtimeEvents: 'powerlog_realtime_events_total',
    redisUp: 'powerlog_redis_up',
    coachInvitations: 'powerlog_coach_invitations_total',
    coachLinksRemoved: 'powerlog_coach_links_removed_total',
    coachingLinks: 'powerlog_coaching_links',
    coachingCoaches: 'powerlog_coaching_coaches',
    coachingAthletes: 'powerlog_coaching_athletes',
    coachingPendingInvitations: 'powerlog_coaching_pending_invitations',
    entitlementDenials: 'powerlog_entitlement_denials_total',
    subscriptions: 'powerlog_subscriptions',
    subscriptionsByPlan: 'powerlog_subscriptions_by_plan',
    mrrCents: 'powerlog_mrr_cents',
    subscriptionsCanceling: 'powerlog_subscriptions_canceling',
    gatewayRequestDuration: 'powerlog_gateway_request_duration_seconds',
    planSync: 'powerlog_plan_sync_total',
    checkoutSessions: 'powerlog_checkout_sessions_total',
    subscriptionEvents: 'powerlog_subscription_events_total',
    offerRedemptions: 'powerlog_offer_redemptions_total',
    billingWebhooks: 'powerlog_billing_webhooks_total',
    billingWebhookRetries: 'powerlog_billing_webhook_retries_total',
    billingDrift: 'powerlog_billing_drift',
} as const

// Latency buckets in seconds (web/API request + DB call range).
const DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]

// LLM calls live on a different timescale than the rest of the app: a long
// completion takes tens of seconds, so DURATION_BUCKETS would pile everything
// into the +Inf bucket and lose all resolution.
const LLM_DURATION_BUCKETS = [0.25, 0.5, 1, 2.5, 5, 10, 20, 30, 60, 120]

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
    // Mesocycle lifecycle signals — dimensions the CQRS command name can't carry.
    // Status transitions by target status (draft/active/completed/archived): the
    // meso lifecycle funnel (set by PrometheusMesocycleMetrics).
    makeCounterProvider({
        name: METRIC.mesocycleStatusTransitions,
        help: 'Count of mesocycle status transitions, by target status.',
        labelNames: ['status'],
    }),
    // Planned sessions materialized when generating a mesocycle week, by mode
    // (fresh first generation vs replace/regenerate). Incremented by session count.
    makeCounterProvider({
        name: METRIC.mesocycleSessionsGenerated,
        help: 'Count of planned sessions generated from mesocycle weeks, by mode.',
        labelNames: ['mode'],
    }),
    // BYOK LLM calls (set by MeteredLlmProviderClient). `model` is deliberately
    // NOT a label: users pick it from their own provider account, so it is
    // unbounded from the app's point of view. provider/operation/status are
    // bounded enums.
    makeCounterProvider({
        name: METRIC.llmRequests,
        help: 'Count of LLM provider calls, by provider, operation and outcome.',
        labelNames: ['provider', 'operation', 'status'],
    }),
    makeHistogramProvider({
        name: METRIC.llmRequestDuration,
        help: 'Duration of LLM provider calls in seconds.',
        labelNames: ['provider', 'operation', 'status'],
        buckets: LLM_DURATION_BUCKETS,
        enableExemplars: true,
    }),
    // Tokens billed to the user's own provider account, split by direction.
    // The cost is theirs (BYOK); this is a usage signal, not a billing source.
    makeCounterProvider({
        name: METRIC.llmTokens,
        help: 'Count of LLM tokens consumed, by provider and direction (input/output).',
        labelNames: ['provider', 'direction'],
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
    // Live-update stream (set by RealtimeHub). One connection per open tab of a
    // signed-in user, so this doubles as a rough "users with the app open" signal.
    makeGaugeProvider({
        name: METRIC.realtimeConnections,
        help: 'Currently open realtime (SSE) connections.',
    }),
    // Counts recipients, not publishes: an event fanned out to a coach and an
    // athlete increments by 2. Type is a bounded enum (no userId).
    makeCounterProvider({
        name: METRIC.realtimeEvents,
        help: 'Count of realtime events pushed to connected clients, by type.',
        labelNames: ['type'],
    }),
    // Redis connectivity, driven by the client's own connection events (set by
    // RedisModule). 0 also means "not configured" — Redis is optional, and the
    // features that use it fall back in-process.
    makeGaugeProvider({
        name: METRIC.redisUp,
        help: 'Redis reachability: 1 = connected, 0 = down or not configured.',
    }),
    // Coaching (set by PrometheusCoachingMetrics). The per-command CQRS histograms
    // already give the rate/failures of every coaching command, so these carry only
    // what those can't: the `invitee` dimension (coaching as an acquisition channel)
    // and the sign-up auto-link, which runs in an event handler, not a command.
    makeCounterProvider({
        name: METRIC.coachInvitations,
        help: 'Coach invitations, by outcome and whether the invitee already had an account.',
        labelNames: ['status', 'invitee'],
    }),
    makeCounterProvider({
        name: METRIC.coachLinksRemoved,
        help: 'Coach↔athlete links broken, by who ended the relationship.',
        labelNames: ['by'],
    }),
    // Current coaching state, sampled at scrape time from the read model already
    // backing the admin dashboard (set by CoachingStateMetrics).
    makeGaugeProvider({
        name: METRIC.coachingLinks,
        help: 'Active coach↔athlete links.',
    }),
    makeGaugeProvider({
        name: METRIC.coachingCoaches,
        help: 'Coaches with at least one athlete.',
    }),
    makeGaugeProvider({
        name: METRIC.coachingAthletes,
        help: 'Athletes with at least one coach.',
    }),
    makeGaugeProvider({
        name: METRIC.coachingPendingInvitations,
        help: 'Invitations still awaiting a response (the backlog).',
    }),
    // Every time a plan says no. Incremented in the Entitlements adapter, the one
    // place all denials pass through: this is demand for a feature, measured at the
    // moment someone wanted it and couldn't have it. `feature` is the closed
    // Feature union plus `athletes` (the coach cap); `plan` is a catalog slug, so
    // all three labels stay bounded.
    makeCounterProvider({
        name: METRIC.entitlementDenials,
        help: 'Actions refused because the user’s plan does not include them.',
        labelNames: ['feature', 'audience', 'plan'],
    }),
    // Where the business stands, sampled at scrape time from the same read model
    // that backs the admin billing panel (set by BillingStateMetrics). `plan` is a
    // catalog slug — bounded, admin-created; never a user or gateway id.
    makeGaugeProvider({
        name: METRIC.subscriptions,
        help: 'Subscriptions currently granting their plan, by status and gateway.',
        labelNames: ['status', 'gateway'],
    }),
    makeGaugeProvider({
        name: METRIC.subscriptionsByPlan,
        help: 'Subscriptions currently granting their plan, by plan — which plans sell and which are dead.',
        labelNames: ['plan', 'audience'],
    }),
    makeGaugeProvider({
        name: METRIC.mrrCents,
        help: 'Monthly recurring revenue in cents (each interval normalised to a month), by plan and currency.',
        labelNames: ['plan', 'currency'],
    }),
    makeGaugeProvider({
        name: METRIC.subscriptionsCanceling,
        help: 'Cancelled but still inside the period they paid for: churn already decided, not yet visible.',
    }),
    // Outgoing calls to the payment providers — the same treatment mail and R2 get.
    makeHistogramProvider({
        name: METRIC.gatewayRequestDuration,
        help: 'Duration of outgoing calls to a payment gateway.',
        labelNames: ['gateway', 'operation', 'status'],
        buckets: DURATION_BUCKETS,
    }),
    makeCounterProvider({
        name: METRIC.planSync,
        help: 'Catalog publications to a payment gateway.',
        labelNames: ['gateway', 'status'],
    }),
    makeCounterProvider({
        name: METRIC.checkoutSessions,
        help: 'Checkout funnel: started here, completed/expired by webhook.',
        labelNames: ['gateway', 'plan', 'status'],
    }),
    makeCounterProvider({
        name: METRIC.subscriptionEvents,
        help: 'The subscription lifecycle — churn and dunning recovery are derived from this.',
        labelNames: ['type', 'gateway'],
    }),
    makeCounterProvider({
        name: METRIC.offerRedemptions,
        help: 'Signups that came in through an offer.',
        labelNames: ['plan'],
    }),
    // `duplicate` is visible on purpose: it is the proof the idempotency works.
    makeCounterProvider({
        name: METRIC.billingWebhooks,
        help: 'Inbound billing webhooks, by outcome.',
        labelNames: ['gateway', 'type', 'status'],
    }),
    // Backoff retries of failed webhooks. `exhausted` is the alertable one.
    makeCounterProvider({
        name: METRIC.billingWebhookRetries,
        help: 'Backoff retries of failed billing webhooks, by outcome.',
        labelNames: ['gateway', 'outcome'],
    }),
    // Subscriptions the gateway thinks are live but we do not (a webhook we never
    // got), plus the reverse. **It should always be zero** — which is exactly what
    // makes it worth alerting on: a missed webhook bills people wrongly for weeks
    // in complete silence otherwise. A gateway that could not be asked leaves its
    // series untouched rather than reporting a fabricated zero.
    makeGaugeProvider({
        name: METRIC.billingDrift,
        help: 'Disagreements between our subscriptions and the gateway’s. Should be 0.',
        labelNames: ['gateway'],
    }),
]
