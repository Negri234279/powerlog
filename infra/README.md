# infra

One folder per environment, plus a **single source of truth for observability**
shared by all of them — edit a dashboard or alert once and it applies everywhere.

```
infra/
├── docker/                 # Dockerfiles (api/web) — shared build context = repo root
├── observability/          # SINGLE SOURCE: prom · loki · tempo · alloy · alertmanager
│   ├── prometheus/         #   prometheus.yml (base) + rules/ (Prometheus-native alerts)
│   ├── loki/ tempo/ alloy/ alertmanager/
│   └── grafana/            #   provisioning (datasources) + dashboards
├── dev/                    # ALL-IN-ONE, depends on nothing (own pg + grafana + obs + mailpit)
│   ├── compose.yml · .env.example · scrape.d/postgres.yml
├── staging/                # OVERRIDE on prod: build-local images + APP_ENV=staging
│   ├── compose.yml · staging.env.example
├── prod/                   # Pi deploy (synced to pi-infra/apps/powerlog/prod by CI)
│   ├── compose.yml · powerlog.env.example · postgres/provision.env.example · scrape.d/
└── test/                   # ephemeral Postgres (tmpfs) for shared/e2e runs
    └── compose.yml · .env.example
```

**How it's DRY:** every env names its services `powerlog-*`, so the configs in
`observability/` are byte-identical across dev/staging/prod. Each env's compose
just mounts `../observability/...`; only the **env vars** (and dev's extra
grafana/pg/mailpit) differ. `prod` and `staging` are *isolated* (join the shared
`monitoring` + `db` networks from pi-infra); `dev` is self-contained.

## Run

```bash
# DEV — all-in-one (app + pg + full obs + grafana). Nothing else needed.
docker compose -f infra/dev/compose.yml --env-file infra/dev/.env up --build
#   Grafana http://localhost:13000 · Prometheus :9090 · Mailpit :18025

# STAGING — simulate prod locally. First bring up pi-infra core (shared
# Postgres/PgBouncer/Grafana), then layer staging over prod (two -f files):
docker compose -f infra/prod/compose.yml -f infra/staging/compose.yml up -d --build

# PROD — runs on the Pi via pi-infra (apps/powerlog/prod). Not run from here.

# TEST — ephemeral shared Postgres only (Testcontainers don't need this).
docker compose -f infra/test/compose.yml --env-file infra/test/.env up -d powerlog-postgres
```

## Notes

- **Secrets**: each env ships a `*.env.example`; copy it (to `.env` for dev/test,
  `staging.env` for staging, `powerlog.env` + `postgres/provision.env` for prod)
  and fill it in. Real env files are git-ignored.
- **Alerts** are Prometheus-native (single `observability/prometheus/rules/`),
  edited once. dev shows them in Prometheus/Grafana; staging/prod route to Discord
  via their `powerlog-alertmanager`.
- **prod ↔ pi-infra**: `infra/prod/` + `infra/observability/` are mirrored into the
  pi-infra repo by the `sync-pi-infra` action — see `infra/prod/README.md`.
- **dev fast loop**: run only `powerlog-postgres` (+ obs) in Docker and the API on
  the host with `pnpm dev` (the host-run API won't be scraped by Prometheus).
