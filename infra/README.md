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
grafana/pg/mailpit) differ. `prod` and `staging` are _isolated_ (join the shared
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

## Webhooks de pasarela (Stripe / PayPal) en dev

Las suscripciones **solo cambian de estado por webhook**. Stripe y PayPal necesitan
una URL pública HTTPS, así que en local no llega ninguno: el flujo entero queda a
medias sin que nada dé error. El dev compose trae un túnel opcional para eso:

```bash
docker compose -f infra/dev/compose.yml --profile tunnel up -d powerlog-tunnel
docker logs powerlog-tunnel 2>&1 | grep trycloudflare.com   # → https://<random>.trycloudflare.com
```

Esa URL va a `POST /webhooks/stripe` y `POST /webhooks/paypal`. Es efímera (cambia
en cada arranque del contenedor), pero **no hace falta crear un endpoint nuevo cada
vez**: en Stripe y en PayPal, editar la URL de un endpoint existente conserva su
signing secret / webhook id ⇒ `STRIPE_WEBHOOK_SECRET` y `PAYPAL_WEBHOOK_ID` siguen
valiendo.

Dos cosas que no son bugs:

- **El catálogo hay que publicarlo antes**: sin `syncPlanToGateway` (botón en
  `/admin/plans`) los planes no existen del lado de la pasarela y no hay checkout
  que iniciar.
- **El simulador de webhooks de PayPal no sirve para probar el endpoint**: sus
  eventos de prueba no pasan la verificación de firma (PayPal la hace preguntando a
  su propia API por el evento, y el simulado no existe allí). Hace falta una
  suscripción real de sandbox.

`/admin/billing` es el sitio donde se ve si están llegando (último webhook por
pasarela, fallidos, replay).

> **Por qué no basta con un subdominio del Pi**: el TLS de Cloudflare en el plan
> free (Universal SSL) cubre `negri.es` y `*.negri.es` — **un solo nivel**. Cualquier
> host más profundo (`dev.api.powerlog.es.negri.es`, `api.powerlog.negri.es`) resuelve
> pero **revienta el handshake**: no hay certificado que lo cubra, y el navegador o
> Stripe ven un error de TLS, no un 404. Si en algún momento se quiere un host estable
> para webhooks, tiene que ser de **un nivel** (`powerlog-api.negri.es`) o pagar el
> certificado avanzado.

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
- **Un dashboard o una alerta nuevos no aparecen solos**: Prometheus no revisa los
  ficheros de reglas (y en dev no lleva `--web.enable-lifecycle`, así que tampoco hay
  `/-/reload`) y el provisioner de Grafana solo los recoge de forma fiable al arrancar.
  Tras tocar `observability/prometheus/rules/` o `observability/grafana/dashboards/`:
  `docker restart powerlog-prometheus powerlog-grafana`.
