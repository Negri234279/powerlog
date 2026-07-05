# Web observability — Grafana Faro (RUM) + structured logs

Frontend telemetry for `@powerlog/web`. Everything lives in the **Grafana
stack** (Loki / Tempo / Prometheus) — the same pane as the API, correlated and
alertable from one place. PostHog was removed (2026-07): no session replay /
funnels, in exchange for first-party RUM correlated with backend traces.

- **RUM (Web Vitals, JS errors, session/view events, product + click events) →
  Grafana Faro SDK → Alloy `faro.receiver` → Loki** (logfmt lines,
  `{app="powerlog-web", job="faro"}`).
- **Browser traces → Faro web-tracing → Alloy → Tempo**: every fetch (GraphQL
  via `/api/*`) emits a span with `traceparent`, so traces run
  **browser → web proxy → API** end-to-end.
- **Server logs → stdout → Alloy → Loki** (parity with the API's Pino logs).
- **Server traces → Tempo** (OTel via `@vercel/otel`, unchanged).

## Architecture

```
Browser (Faro SDK: vitals / errors / events / fetch spans)
   └─► /faro/*  (same-origin) ── next.config rewrite ──► powerlog-alloy:12347 (faro.receiver)
                                                            ├─ logs/events/vitals/exceptions ─► Loki
                                                            └─ traces (OTLP) ────────────────► Tempo
Next server ─┬─ JSON logs → stdout ─► Alloy ─► Loki
             └─ OTel spans (fetch→API) ─► Tempo (OTLP 4318)
```

The `/faro` reverse proxy keeps ingestion first-party (no CORS, immune to
ad-blockers) and means Alloy needs **no exposed port in prod** — the browser
never talks to it directly. Rewrites are baked at **build time**
(`FARO_INTERNAL_URL`, like `API_INTERNAL_URL`).

## Files

| File                                    | Role                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `lib/analytics/faro.ts`                 | Faro bootstrap: instrumentations, app metas (name/version/env), enable/disable logic.    |
| `lib/analytics/events.ts`               | Typed event catalog + `track()` / `identifyUser()` / `resetAnalytics()` over `faro.api`. |
| `instrumentation-client.ts`             | Calls `initFaro()` once before hydration. No-ops in dev without the flag.                |
| `components/ui/tracked.tsx`             | **TrackedButton / TrackedLink** — the only allowed interactive primitives (see below).   |
| `components/app/faro-route-tracker.tsx` | Syncs App Router navigations into Faro's `view` meta (ids sanitised to `:id`).           |
| `next.config.ts` → `rewrites()`         | `/faro/*` reverse proxy to Alloy's faro.receiver; inlines app version/env.               |
| `lib/log/server.ts`                     | Dependency-free structured server logger (`log.info/warn/error/debug`).                  |
| `instrumentation.ts`                    | Server OTel via `@vercel/otel` (`register()`) → Tempo; no-ops without an OTLP endpoint.  |

## Env

```
NEXT_PUBLIC_FARO_DEV     # 'true' enables Faro in dev (prod builds are always on)
FARO_INTERNAL_URL        # rewrite target, BUILD time. Dev: http://localhost:12347
                         # (compose publishes Alloy's 12347); Docker build ARG
                         # defaults to http://powerlog-alloy:12347
APP_ENV                  # baked as app.environment (NEXT_PUBLIC_APP_ENV); Docker ARG=prod
OTEL_SERVICE_NAME / OTEL_EXPORTER_OTLP_ENDPOINT / ...   # server traces, unchanged
```

`app.version` is read from `apps/web/package.json` at build and stamped on
every Faro signal (mirrors the API's `service.version`).

Note: the **staging** compose has no observability stack; its `/faro` rewrite
points at the default DNS name and requests fail harmlessly. Pass the
`FARO_INTERNAL_URL` build arg there if staging ever grows an Alloy.

## Tracked components — the rule

**Never render a bare `<button>`, `<a>` or `<Link>`.** Every interactive
element goes through `TrackedButton` / `TrackedLink`
(`components/ui/tracked.tsx`) or a primitive built on them (`SubmitButton`,
`Menu`, `Modal`, `ConfirmModal`, `MultiSelect`, `SlidingTabs`, `PlusMenuMorph`,
`ClearableSearch`, `PrimaryCta`/`SecondaryCta`). All of them require a stable
kebab-case `analyticsId` and emit a single `ui_click { id, kind }` event, so
"which controls get used" has total coverage by construction.

Audit: `grep -rn '<button\|<a \|<Link' app components --include='*.tsx'` must
only hit `components/ui/tracked.tsx`.

`analyticsId` rules: stable literal, kebab-case, finite set — **never**
interpolate user data or row ids (`session-open`, not `session-${id}`; the
dashboards break down by this value).

## Event catalog (`lib/analytics/events.ts`)

Unchanged contract (snake*case, low-cardinality, PII-free): `user_registered`,
`user_logged_in`, `user_logged_out`, `auth_failed{action,code}`,
`profile_updated`, `avatar_updated/_removed`, `password_changed/_reset`,
`email_verified`, `workout_session*_`, `workout*template*_`,
`session_created_from_template`, `set_logged`, `session_completed`, plus
`ui_click{id,kind}` (emitted only by the tracked primitives).

Automatic from Faro: `session_start`, `view_changed`, Web Vitals measurements
(`kind=measurement type=web-vitals`), exceptions (`kind=exception`), and fetch
spans in Tempo.

`identifyUser(userId, username)` → `faro.api.setUser` (public handle only,
never email); `resetAnalytics()` on logout.

## Querying in Grafana

Dashboard **“powerlog · Web RUM (Faro)”** (`web-rum.json`, provisioned like the
rest): Web Vitals p75 stats + series, sessions/views, `ui_click` by control,
product events, JS errors by type, raw stream.

Ad-hoc in Explore → `powerlog · Logs`:

```logql
{app="powerlog-web", job="faro"} | logfmt | kind=`event` | event_name=`ui_click`
{app="powerlog-web", job="faro"} | logfmt | kind=`measurement` | type=`web-vitals`
{app="powerlog-web", job="faro"} | logfmt | kind=`exception`
```

Browser traces in Explore → `powerlog · Traces`: search
`{resource.service.name="powerlog-web"}` — browser spans now parent the API's
spans (same trace id as `powerlog-api`).

## Privacy / PII

- Event properties carry **no PII**: bounded enums + stable control ids only.
- `identify` uses userId + public `username`; never email or tokens.
- Faro captures page URLs — app routes carry no PII (ids are opaque UUIDs) and
  the view meta sanitises them to `:id` anyway.
- The `/faro` endpoint accepts writes only; nothing is readable from the browser.

## Verifying live

1. `docker compose -f infra/dev/compose.yml up` (Alloy publishes 12347).
2. `NEXT_PUBLIC_FARO_DEV=true` in `apps/web/.env`, `pnpm --filter @powerlog/web dev`.
3. Browse the app, click around, then in Grafana Explore run the LogQL above —
   events appear within seconds (Faro batches ~250 ms).
4. Tempo: search `powerlog-web` and open a GraphQL fetch span; it should
   continue into `powerlog-api`.
