# Web observability — PostHog + structured logs

Frontend telemetry for `@powerlog/web`. Split by concern from the backend:

- **Product analytics + session replay + Web Vitals + JS errors → PostHog Cloud**
  (free tier). PostHog owns funnels/retention/replay — things the Grafana stack
  is weak at.
- **Server logs → stdout → Alloy → Loki** (parity with the API's Pino logs).
- **Server traces → Tempo** (OTel via `@vercel/otel`; auto-instrumented fetch
  propagates `traceparent`, so server→API calls are end-to-end traced).
- Backend ops (API traces/logs/metrics) stay on **Grafana + Tempo/Loki/Prometheus**,
  unchanged.

Trade-off accepted: **client** product analytics live in PostHog (a separate
pane) and aren't correlated with Tempo — PostHog doesn't emit `traceparent`.
Server-side spans, however, do reach the API's traces.

## Architecture

```
Browser ──$pageview / autocapture / Web Vitals / replay / track()──►
   /ingest/*  (same-origin)  ──next.config rewrites──►  PostHog Cloud (US)

Next server (route handlers) ─┬─ JSON logs to stdout ──► Alloy ──► Loki
                              └─ OTel spans (fetch→API) ──► Tempo (OTLP 4318)
```

The `/ingest` reverse proxy keeps ingestion first-party so ad-blockers don't
drop events. Switching to EU = point the env hosts at the `eu`/`eu-assets`
domains.

## Files

| File                            | Role                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| `instrumentation-client.ts`     | PostHog SDK init (Next 15.3+ client instrumentation). No-ops without a token.           |
| `next.config.ts` → `rewrites()` | `/ingest/*` reverse proxy to PostHog (static/array → assets host, rest → ingest host).  |
| `lib/analytics/events.ts`       | Typed event catalog + `track()` / `identifyUser()` / `resetAnalytics()`.                |
| `components/ui/cta.tsx`         | `analyticsId` → `data-ph-capture-attribute-cta` for named-CTA autocapture.              |
| `lib/log/server.ts`             | Dependency-free structured server logger (`log.info/warn/error/debug`).                 |
| `instrumentation.ts`            | Server OTel via `@vercel/otel` (`register()`) → Tempo; no-ops without an OTLP endpoint. |

## Env

```
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN   # public write key (safe in browser); empty = analytics off
NEXT_PUBLIC_POSTHOG_HOST            # ingest host the proxy forwards to (US default)
NEXT_PUBLIC_POSTHOG_UI_HOST         # app host for the toolbar/links
POSTHOG_ASSETS_HOST                 # static-asset host (derived from HOST if unset)

OTEL_SERVICE_NAME                   # powerlog-web
OTEL_EXPORTER_OTLP_ENDPOINT         # Tempo OTLP base; empty = tracing off. Dev host: http://localhost:4318, compose: http://tempo:4318
OTEL_EXPORTER_OTLP_PROTOCOL         # http/protobuf
OTEL_RESOURCE_ATTRIBUTES            # deployment.environment.name=dev
```

## Privacy / PII

- **Session replay masks all inputs** (`session_recording.maskAllInputs: true`,
  also PostHog's default) — passwords/emails are never recorded. To mask extra
  elements, add `class="ph-no-capture"`.
- **Event properties carry no PII**: no emails, tokens, raw text or ids. Only
  bounded enums (`method`, `action`, `code`). `identify` uses the userId +
  public `username` only.

## Event catalog (`lib/analytics/events.ts`)

| Event             | Properties                            | Fired from                                         |
| ----------------- | ------------------------------------- | -------------------------------------------------- |
| `user_registered` | `method: 'password'`                  | register form (success)                            |
| `user_logged_in`  | `method: 'password'`                  | login form (success)                               |
| `user_logged_out` | —                                     | app shell logout                                   |
| `auth_failed`     | `action: 'register'\|'login'`, `code` | auth forms (catch); `code` = API `extensions.code` |
| `profile_updated` | —                                     | profile page (save success)                        |

Plus automatic: `$pageview`, `$pageleave`, `$autocapture` (clicks), `$web_vitals`,
`$exception`. Named CTAs add a `cta` property (`nav-register`, `hero-register`,
`hero-see-data`, `nav-mobile-register`).

Future events (added when their UI lands): `workout_session_created`,
`set_logged`, `session_completed`, `coach_invite_sent`/`_accepted`.

## Dashboards in PostHog (built)

Built 2026-06-17 via the PostHog MCP in project **474976** (PostHog Cloud US,
org `powerlog-dev`). Dashboard **"Web — Product Analytics (powerlog)"** (id
`1727063`, pinned) holds the 5 insights below; item 6 is a saved replay filter.
All sit empty until real usage arrives (only smoke-test `$pageview`/`$autocapture`
exist so far — no `user_registered`/`auth_failed`/`$web_vitals`/`$exception` yet),
then auto-populate. Rebuild/edit them with the same MCP tools (`insight-create`,
`dashboard-create`, `session-recording-playlist-create`).

1. **Signup funnel** (Funnel, `tf4wuWKL`): step 1 `$autocapture` filtered
   `cta ∈ {nav-register, hero-register, nav-mobile-register}` → step 2
   `user_registered` → step 3 `profile_updated`. Ordered, 1-day window.
2. **Auth failures by code** (Trends, `2cvNdROX`): `auth_failed`, breakdown by
   `code`. Spot `INVALID_CREDENTIALS` spikes. (Covers login + register; the event
   carries `action` if you want to split them.)
3. **CTA clicks by cta** (Trends bar, `TpaaqnSJ`): `$autocapture` where `cta`
   is set, breakdown by `cta`. Answers "which buttons get used".
4. **Web Vitals p75 (LCP / INP / CLS)** (Trends, `ikver3WQ`): p75 of
   `$web_vitals_LCP_value` / `_INP_value` / `_CLS_value`. Add a `$pathname`
   breakdown per-metric for route-level detail.
5. **JS errors by type** (Trends, `3PRHfezH`): `$exception`, breakdown by
   `$exception_type`.
6. **Session replays** (saved filter playlist `Ohy64HrB`, "Signup & auth-failure
   sessions"): sessions containing `user_registered` OR `auth_failed` — watch real
   signup/failure sessions once recordings arrive.

## Server traces (OTel → Tempo)

`instrumentation.ts` calls `@vercel/otel`'s `register()`, which auto-instruments
server `fetch`. The silent-refresh route's call to the API carries `traceparent`,
so in Grafana → Explore → Tempo you can search
`{resource.service.name="powerlog-web"}` and follow a span into the API's trace
(`powerlog-api`). Tracing is disabled when `OTEL_EXPORTER_OTLP_ENDPOINT` is empty.

Verify live (like the API): hit a server route, then query Tempo for the
`powerlog-web` service. This covers server-side fetches only — browser GraphQL
goes through the rewrite proxy and lands in PostHog, not Tempo.

## Server logs in Loki

In Grafana → Explore → Loki: `{service="web"}` (the compose service label). Lines
are JSON: `{ level, time, service, msg, ...fields }`. Notable lines from the
silent-refresh route: `session refresh rejected` (warn), `session refresh failed:
API unreachable` (error).
