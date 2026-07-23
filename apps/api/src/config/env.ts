import { config as loadDotenv } from 'dotenv'
import { z } from 'zod'

/**
 * THE single place allowed to read `process.env` (enforced by the
 * `no-process-env` lint rule).
 *
 * How to consume env elsewhere, in order of preference:
 *   1. In DI scope (services, resolvers, guards, ...): inject
 *      `ConfigService<Env, true>` — the idiomatic NestJS way.
 *   2. Outside DI (bootstrap-time code that runs before Nest is up, e.g.
 *      `tracing.ts` or a `*.forRoot()` factory): import the validated `env`.
 *   3. For deployment-stage checks anywhere: the `isDev/isStaging/isProd/isTest`
 *      flags.
 *
 * Loads apps/api/.env (cwd on host runs / `pnpm dev`) so bootstrap-time code
 * sees the same vars docker-compose injects. Does not override real env vars.
 */
loadDotenv({ path: '.env' })

export const envSchema = z.object({
    // Node runtime mode (affects Node/lib behaviour). Staging runs as
    // "production"; use APP_ENV to distinguish deployment stages.
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // Deployment stage — the source for the isDev/isStaging/isProd/isTest flags.
    APP_ENV: z.enum(['dev', 'staging', 'prod', 'test']).default('dev'),

    API_PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.url(),
    // Direct Postgres URL used ONLY by the migration runner. When the runtime
    // DATABASE_URL points at a transaction-pooling proxy (PgBouncer), migrations
    // must bypass it: the migrator holds a session-level `pg_advisory_lock`,
    // which transaction pooling breaks. Unset → falls back to DATABASE_URL.
    MIGRATIONS_DATABASE_URL: z.url().optional(),

    // Graceful-shutdown drain window: on SIGTERM the server stops accepting
    // connections and waits this long for in-flight requests to finish before
    // force-closing remaining sockets and exiting. Keep it under the
    // orchestrator's SIGTERM→SIGKILL grace period (k8s default 30s).
    SHUTDOWN_DRAIN_TIMEOUT_MS: z.coerce.number().int().positive().default(25_000),

    // ── Access JWT (RS256, signed/verified with jose) ──────────────
    // PEM keys. Inline value wins; otherwise read from the *_PATH file below
    // (default jwt.private.pem / jwt.public.pem, relative to the working dir).
    JWT_PUBLIC_KEY: z.string().default(''),
    JWT_PRIVATE_KEY: z.string().default(''),
    JWT_PRIVATE_KEY_PATH: z.string().default('jwt.private.pem'),
    JWT_PUBLIC_KEY_PATH: z.string().default('jwt.public.pem'),
    JWT_ISSUER: z.string().default('powerlog'),
    JWT_AUDIENCE: z.string().default('powerlog-web'),
    JWT_EXPIRES_IN: z.string().default('15m'),

    // ── Refresh token (opaque, persisted hashed in DB) ─────────────
    REFRESH_EXPIRES_IN: z.string().default('30d'),

    // ── Auth cookies ───────────────────────────────────────────────
    AUTH_COOKIE_NAME: z.string().default('pl_at'),
    REFRESH_COOKIE_NAME: z.string().default('pl_rt'),
    // Secure flag for cookies (true behind HTTPS). zod v4 stringbool
    // parses "true"/"false"/"1"/"0" instead of coercing every string to true.
    COOKIE_SECURE: z.stringbool().default(false),
    COOKIE_DOMAIN: z.string().optional(),

    // ── Google OAuth (authorization-code flow in the backend) ──────
    // Empty by default so the API still boots without Google configured.
    GOOGLE_CLIENT_ID: z.string().default(''),
    GOOGLE_CLIENT_SECRET: z.string().default(''),
    GOOGLE_CALLBACK_URL: z.url().default('http://localhost:4000/auth/google/callback'),

    // Web origin: post-OAuth redirect target, CORS allow-list, email links.
    WEB_ORIGIN: z.url().default('http://localhost:3000'),

    // The API's own public base URL, for links back to its REST endpoints (today:
    // the generated invoice receipt PDF). No trailing slash.
    API_PUBLIC_URL: z.url().default('http://localhost:4000'),

    // ── Mail (transactional email) ─────────────────────────────────
    // smtp → Mailpit in dev; resend in staging/prod.
    MAIL_TRANSPORT: z.enum(['smtp', 'resend']).default('smtp'),
    MAIL_FROM: z.string().default('PowerLog <no-reply@powerlog.local>'),
    RESEND_API_KEY: z.string().default(''),
    // Svix signing secret (whsec_…) for the Resend webhook that feeds delivery
    // metrics (delivered/bounced/complained/…). Empty → the webhook is rejected.
    RESEND_WEBHOOK_SECRET: z.string().default(''),
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_SECURE: z.stringbool().default(false),
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),
    // Destination inbox for contact/support tickets. Empty → the ticket is still
    // stored (the DB is the source of truth), the admin notification email is just
    // skipped. Reply-To on that email is set to the person who wrote in.
    CONTACT_TO: z.string().default(''),
    // Lifetime of an email-verification token.
    EMAIL_VERIFICATION_TTL: z.string().default('24h'),
    // Lifetime of a password-reset token.
    PASSWORD_RESET_TTL: z.string().default('1h'),

    // ── Avatars (object storage + image pipeline) ──────────────────
    // filesystem → local dir (dev); r2 → Cloudflare R2 (prod, S3-compatible).
    AVATAR_STORAGE: z.enum(['filesystem', 'r2']).default('filesystem'),
    AVATAR_DIR: z.string().default('./var/avatars'),
    AVATAR_PUBLIC_BASE_URL: z.string().default('http://localhost:4000/avatars'),
    // Optional URL shown when a user has no avatar ('' → null, client default).
    AVATAR_DEFAULT_URL: z.string().default(''),
    // Cloudflare R2 (only needed when AVATAR_STORAGE=r2).
    R2_ENDPOINT: z.string().default(''),
    R2_ACCESS_KEY_ID: z.string().default(''),
    R2_SECRET_ACCESS_KEY: z.string().default(''),
    R2_BUCKET: z.string().default(''),
    R2_PUBLIC_URL: z.string().default(''),

    // ── AI (BYOK) ──────────────────────────────────────────────────
    // Master key for AES-256-GCM encryption of the users' provider API keys:
    // 32 random bytes, base64-encoded (`openssl rand -base64 32`). Empty is
    // allowed so the app boots without it — only the AI settings calls fail,
    // and they fail loudly (AI_ENCRYPTION_KEY_MISCONFIGURED).
    // Rotating it makes every stored key undecryptable; users must re-enter them.
    AI_ENCRYPTION_KEY: z.string().default(''),

    // ── Redis ──────────────────────────────────────────────────────
    // Optional on purpose: unset → every Redis-backed feature falls back to its
    // in-process implementation (realtime fan-out stays local to this instance),
    // so `pnpm dev` without Docker and the test suites need no Redis at all.
    // Set it in every deployed env. Format: redis://[user:pass@]host:port[/db].
    REDIS_URL: z.url({ protocol: /^rediss?$/ }).optional(),

    // ── Payments (Stripe) ──────────────────────────────────────────
    // Optional on purpose, like REDIS_URL: with no key the gateway is simply not
    // offered (checkout answers GATEWAY_NOT_CONFIGURED) and the app runs in
    // free/manual mode — which is what dev and the test suites do.
    // The webhook secret is what makes an inbound event trustworthy: without it
    // the endpoint refuses every payload rather than trusting an unsigned one.
    STRIPE_SECRET_KEY: z.string().default(''),
    STRIPE_WEBHOOK_SECRET: z.string().default(''),

    // ── Payments (PayPal) ──────────────────────────────────────────
    // Same deal as Stripe: no credentials ⇒ PayPal is simply not offered.
    // `PAYPAL_WEBHOOK_ID` is not a secret to sign with — PayPal verifies a webhook
    // by calling its own API with the id, so without it we cannot authenticate an
    // event and the endpoint refuses everything.
    PAYPAL_CLIENT_ID: z.string().default(''),
    PAYPAL_CLIENT_SECRET: z.string().default(''),
    PAYPAL_WEBHOOK_ID: z.string().default(''),
    PAYPAL_ENV: z.enum(['sandbox', 'live']).default('sandbox'),

    // ── Observability (OpenTelemetry → Tempo) ──────────────────────
    OTEL_SERVICE_NAME: z.string().default('powerlog-api'),
    // OTLP/HTTP base endpoint. Empty (or OTEL_SDK_DISABLED) disables exporting.
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://localhost:4318'),
    OTEL_SDK_DISABLED: z.stringbool().default(false),
})

export type Env = z.infer<typeof envSchema>

/** Parse + validate, throwing a readable error listing every bad variable. */
function parseEnv(raw: Record<string, unknown>): Env {
    const result = envSchema.safeParse(raw)
    if (!result.success) {
        const issues = result.error.issues
            .map((i) => `  - ${i.path.map(String).join('.') || '(root)'}: ${i.message}`)
            .join('\n')
        throw new Error(`Invalid environment variables:\n${issues}`)
    }
    return result.data
}

/** The validated, frozen environment — the single source of truth. */
export const env: Env = Object.freeze(parseEnv(process.env))

/** Deployment-stage flags (prefer these over comparing APP_ENV/NODE_ENV). */
export const isDev = env.APP_ENV === 'dev'
export const isStaging = env.APP_ENV === 'staging'
export const isProd = env.APP_ENV === 'prod'
export const isTest = env.APP_ENV === 'test'

/** Used by `ConfigModule.forRoot({ validate: validateEnv })`. */
export function validateEnv(raw: Record<string, unknown>): Env {
    return parseEnv(raw)
}
