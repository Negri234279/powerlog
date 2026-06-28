# infra

Docker Compose setup with a base file + one override per environment.
Always combine the base with exactly one environment override.

```
infra/
├── docker/
│   ├── Dockerfile.api          # targets: development | build | migrate | production
│   └── Dockerfile.web          # targets: development | build | production
├── docker-compose.yml          # BASE: services, env wiring, healthchecks, depends_on
├── docker-compose.dev.yml      # hot-reload, source bind-mounts
├── docker-compose.staging.yml  # prod-like images, isolated ports/volume
├── docker-compose.prod.yml     # persistent volume, resource limits, internal DB
├── docker-compose.test.yml     # ephemeral Postgres (tmpfs) for shared/e2e tests
└── env/
    ├── dev.env.example
    ├── staging.env.example
    ├── prod.env.example
    └── test.env.example
```

> The Dockerfiles use the **repo root** as build context (they install the
> whole pnpm workspace). Build images only after a successful `pnpm install`
> (a `pnpm-lock.yaml` must exist).

## Ports per environment

| Env     | Postgres | API  | Web  | Project name       |
| ------- | -------- | ---- | ---- | ------------------ |
| dev     | 5432     | 4000 | 3000 | `powerlog-dev`     |
| staging | 5433     | 4001 | 3001 | `powerlog-staging` |
| prod    | internal | 4000 | 3000 | `powerlog-prod`    |
| test    | 5434     | 4002 | 3002 | `powerlog-test`    |

Different project names + ports mean several environments can run side by side.

## Commands

```bash
# DEV — containerized hot reload
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml \
  --env-file infra/env/dev.env up --build

# STAGING
docker compose -f infra/docker-compose.yml -f infra/docker-compose.staging.yml \
  --env-file infra/env/staging.env up -d --build

# PROD (prefer pulling tagged images)
docker compose -f infra/docker-compose.yml -f infra/docker-compose.prod.yml \
  --env-file infra/env/prod.env up -d

# TEST — ephemeral shared Postgres only
docker compose -f infra/docker-compose.yml -f infra/docker-compose.test.yml \
  --env-file infra/env/test.env up -d postgres

# Run DB migrations in any env (one-shot `migrate` service, profile `tools`)
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml \
  --env-file infra/env/dev.env --profile tools run --rm migrate
```

## Notes

- **dev**: for the fastest inner loop run only `postgres` in Docker and the apps
  on the host via `pnpm dev`.
- **test**: unit/integration tests use **Testcontainers** (their own throwaway
  Postgres). This compose is only for a shared test DB or end-to-end runs
  (`--profile e2e` brings up api/web).
- **prod**: Postgres has no published port; reach it only via the internal
  network. Inject secrets (`JWT_*`, `POSTGRES_PASSWORD`) from a secret manager,
  never commit real `*.env` files (only `*.env.example` is tracked).
