# Bloque 9 — Planes, suscripciones y pagos (Stripe + PayPal)

> **Planteamiento cerrado el 2026-07-13.** Diseño acordado con el usuario
> (decisiones abajo). Implementar **por sub-bloques con checkpoint** como el resto
> del proyecto: generar un bloque, resumir, esperar OK.
>
> **Estado: [x] 9.1 · [ ] 9.2 · [ ] 9.3 · [ ] 9.4 · [ ] 9.5.** El detalle de lo
> construido en 9.1 está en [HANDOFF.md](../HANDOFF.md).

## Ajustes al plan decididos al implementar 9.1 (mandan sobre lo de abajo)

| Tema                     | Cómo quedó                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Entitlements de coach    | **Sin duplicar**: `{ maxAthletes, planSessions, athlete: {templates, mesocycles, ai} }`. Las features personales del coach **son** las de atleta (una sola verdad para "¿puede usar IA?"). El plan colapsa a un snapshot plano |
| Contenido del free       | `athlete-free`: templates ✔ mesocycles ✔ **ai ✘** · `coach-free`: 3 atletas, planSessions ✔, **ai ✘**. Entrenar es gratis; **la IA se paga**                                                                                   |
| Cache de entitlements    | **No en 9.1** (solo se lee en el write-path). Entra en **9.3** con Redis + invalidación por evento, cuando `myEntitlements` lo lea la web en cada carga                                                                        |
| `plan_offers`            | **Aplazada a 9.3**: una oferta no tiene efecto hasta que hay checkout. Las tablas de 9.1 son `plans`, `plan_prices` y `subscriptions`                                                                                          |
| `PlanPriceEntity`        | **Aplazada a 9.2**: en 9.1 la tabla existe y el seed la llena, pero nada del dominio la lee todavía                                                                                                                            |
| Detalles en `extensions` | Vía **`DomainError.details`** (genérico, en el kernel) + el `GlobalExceptionFilter`. Hubo que abrir el `formatError` de Apollo, que hacía whitelist a `{message, code}`                                                        |
| Precios del seed         | Puestos como punto de partida (`athlete-pro` 7,99 €/mes · `coach-pro` 19,99 € · `coach-elite` 39,99 €; año = 10 meses). Cambiarlos **no es un UPDATE**: se desactiva la fila y se inserta otra                                 |

## Decisiones cerradas (no recuestionar sin motivo)

| Tema                         | Decisión                                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pasarelas                    | **Stripe y PayPal desde el día 1**, ambas detrás de un puerto `PaymentGateway`                                                                                      |
| Facturas                     | Las genera la **pasarela**; nosotros las **espejamos en DB** vía webhook (número, importes, link al PDF alojado). Cero lógica fiscal propia                         |
| Plan free                    | **Sí**, por defecto (uno de atleta y uno de coach), sembrados por **migración**. Sin fila de suscripción: free = fallback cuando no hay suscripción activa          |
| Downgrade                    | **Suave**: al caer al free se bloquea crear por encima del límite; **no se borra ni desvincula nada** existente                                                     |
| Monedas                      | **EUR + USD desde el inicio**: cada plan define precio por moneda; el usuario elige (default por locale)                                                            |
| Cambio de plan a mitad ciclo | **Upgrade inmediato con prorrateo** (nativo en Stripe); **downgrade programado al final del periodo** pagado                                                        |
| Editar un plan publicado     | **Features/límites retroactivos** (los entitlements se leen del plan actual). **Precio inmutable por versión**: cambiarlo crea versión nueva solo para altas nuevas |
| Atleta + coach               | **UNA suscripción por usuario**. El plan de coach incluye también los entitlements de atleta (sección `athlete` dentro del plan de coach). Sin doble cobro          |
| Ofertas (trial/intro)        | **Exigen método de pago al alta**; se modelan con los mecanismos nativos (Stripe trial+coupons, PayPal trial billing cycles) y al acabar cobran solas               |
| Cancelación                  | **Cancel-at-period-end** siempre (desde la app o desde la pasarela): el usuario conserva los entitlements hasta `current_period_end`                                |

## Punto de partida (ya existe — no rehacer)

- **Seam `Entitlements`** ya montado a propósito para esto:
  `src/shared/contracts/entitlements.ts` (puerto abstracto) +
  `src/entitlements/` (módulo `@Global` que hoy bindea `UnlimitedEntitlements`).
  Único método actual: `assertCanAddAthlete(coachId, currentAthleteCount)`,
  llamado desde `invite-athlete.handler.ts` (coaching). **El trabajo es
  reemplazar el binding por un adapter plan-aware y ampliar la superficie.**
- **IA es BYOK**: la key es del usuario, no hay coste de la app por generación ⇒
  “puede usar IA” es un **check booleano** de plan, no una cuota medida.
  (El modelo jsonb de límites permite añadir cuotas mensuales más adelante.)
- **Features existentes a gatear**: templates (`workout_templates`), mesociclos
  (`mesocycle_*`), IA (drafts de sesión y de mesociclo), coaching (nº de atletas),
  planificación de sesiones a atletas.
- **Cruce entre módulos**: prohibido importar; el patrón establecido es
  QueryBus/CommandBus readers (`src/planning/query-bus-*-reader.ts`) e
  integration events en `src/shared/integration-events/`.
- **Admin**: `AdminGuard` (API) + `/admin` (web) con `AdminTabs`.
- **Webhook REST sancionado**: ya existe la excepción para Resend; los webhooks
  de Stripe/PayPal entran en la misma categoría (firma sobre el body crudo ⇒
  REST obligatorio).

## Módulo nuevo: `src/modules/billing/` (Clean Arch + CQRS)

Un solo módulo que posee planes, suscripciones, facturas-espejo y webhooks.
Nada fuera de él conoce Stripe/PayPal.

### Dominio

- **`PlanAggregate`** — catálogo. `audience: 'athlete' | 'coach'`, slug, nombre,
  descripción, `status: draft | active | archived`, `isFree`, `sortOrder` y
  **`entitlements`**: VO sobre jsonb, validado con **zod por audience**.
  Atleta: `{ templates: bool, mesocycles: bool, ai: bool }`. Coach:
  `{ maxAthletes: number | null /* null = ∞ */, ai: bool, templates: bool, planSessions: bool, athlete: <entitlements de atleta> }`.
  Va en jsonb + zod porque el usuario quiere planes **muy dinámicos**: añadir un
  check nuevo = ampliar el schema zod y el form de admin, sin migración.
  Reglas: solo puede haber **un plan free activo por audience**; un plan
  `archived` no admite altas nuevas pero las suscripciones vivas lo siguen leyendo.
- **`PlanPriceEntity`** — versión de precio **inmutable**:
  `interval` (`month | quarter | semester | year` → se mapea a
  `interval_unit + interval_count` en las pasarelas), `currency (EUR|USD)`,
  `amountCents`, `active`, `stripePriceId`, `paypalPlanId`.
  Cambiar precio = desactivar la fila y crear otra; las suscripciones existentes
  siguen apuntando a la suya.
- **`PlanOfferEntity`** — oferta de introducción ligada a un plan:
  `trialDays?` + `introPhase? { cycles, amountCents }` (cubre “1er mes gratis”
  y “3 meses a X y luego Y”), ventana de validez (`startsAt/endsAt`), `active`.
  Solo aplica a **altas nuevas**. Mapeo: Stripe → `trial_period_days` +
  coupon `duration_in_months`; PayPal → trial billing cycles en el Plan.
- **`SubscriptionAggregate`** — estado local (la pasarela es la fuente de verdad
  del dinero; esto es la proyección con la que decidimos entitlements):
  `userId` (soft ref), `planId`, `planPriceId`, `offerId?`,
  `gateway: stripe | paypal | manual`, `gatewayCustomerId?`,
  `gatewaySubscriptionId?` (unique),
  `status: incomplete | trialing | active | past_due | canceled | expired`,
  `currentPeriodStart/End`, `cancelAtPeriodEnd`, `canceledAt?`,
  `pendingPlanPriceId?` (downgrade programado).
    - `gateway = 'manual'`: asignación por admin (comps, tests, soporte) sin pasarela.
    - **Regla de entitlement**: la suscripción “cuenta” si
      `status ∈ (trialing, active, past_due)` **o** (`canceled` y
      `now < currentPeriodEnd`) — así una cancelación (venga de la app o de la
      plataforma) **respeta el tiempo restante ya pagado**. `past_due` mantiene
      acceso mientras la pasarela reintenta (dunning); cuando la pasarela se
      rinde llega el webhook de cancelación y ahí sí cae.
- **`InvoiceEntity`** — espejo plano (como `NotificationEntity`, no agregado):
  `userId`, `subscriptionId`, `gateway`, `gatewayInvoiceId` (unique), `number?`,
  `status`, `amountDueCents`, `amountPaidCents`, `currency`, `hostedUrl?`,
  `pdfUrl?`, `issuedAt`, `paidAt?`.
  **Asimetría asumida**: Stripe da factura con PDF; PayPal da transacciones
  (sin PDF) → se espejan como factura pagada sin `pdfUrl`. El área de facturación
  muestra el registro igual.
- **Errores** (extienden `DomainError`, code estable):
  `FEATURE_NOT_IN_PLAN` (con `extensions.feature` para que la web pinte el CTA
  de upgrade), `PLAN_LIMIT_REACHED` (con `limit`/`current`),
  `PLAN_NOT_AVAILABLE`, `SUBSCRIPTION_ALREADY_ACTIVE`, `NO_ACTIVE_SUBSCRIPTION`,
  `GATEWAY_NOT_CONFIGURED`, `PLAN_SYNC_FAILED`, `LAST_FREE_PLAN` (no archivar el único free).

### Persistencia (tablas nuevas, migraciones Drizzle)

- `plans` · `plan_prices` (unique parcial: **una activa por
  `(plan_id, interval, currency)`**) · `plan_offers`
- `subscriptions` (unique `gateway_subscription_id`; índice parcial **una
  suscripción “viva” por `user_id`** — `WHERE status IN (...)`, mismo truco que
  el índice de drafts de IA)
- `invoices` (unique `(gateway, gateway_invoice_id)`)
- `billing_webhook_events`: `gateway`, `event_id` (unique), `type`, `payload`
  jsonb, `status (received|processed|failed)`, `processed_at` — **idempotencia**
  (un evento repetido es no-op) + replay manual si un handler falla.
- **Seed por migración** (lo pidió el usuario — tener planes ya):
    - `athlete-free` (templates ✔, mesocycles ✔, ai ✘) — ajustar checks al gusto en la implementación
    - `athlete-pro` (todo ✔) con prices EUR/USD × month/year
    - `coach-free` (maxAthletes 3, ai ✘, templates ✔, planSessions ✔, athlete=athlete-free)
    - `coach-pro` (maxAthletes 20, todo ✔, athlete=athlete-pro) + `coach-elite` (∞)
    - Los de pago nacen `active` pero **sin ids de pasarela**: la sync se hace al
      publicar/on-demand desde admin cuando haya keys (ver abajo). El seed no
      llama a ninguna API externa.

### Resolución de entitlements (el enchufe)

- Query CQRS **`GetUserEntitlementsQuery(userId)`** en billing: suscripción viva
  → entitlements del plan actual (retroactivo por diseño); si no hay → plan free
  del audience según el rol del usuario (coach ⇒ free de coach, que incluye su
  sección de atleta).
- **`PlanAwareEntitlements`** (en `src/entitlements/`, sustituye el binding de
  `UnlimitedEntitlements`) despacha esa query vía **QueryBus** (patrón
  `src/planning/`) — sin import cross-module. **Cache Redis con TTL corto
  (~60s, TTL propio por `noeviction`)** + fallback in-process sin `REDIS_URL`;
  se invalida por evento de cambio de suscripción. La superficie del puerto crece:
    - `assertCanAddAthlete(coachId, current)` (ya existe)
    - `assertFeature(userId, feature)` — `feature: 'templates' | 'mesocycles' | 'ai' | 'plan_sessions'`
    - `forUser(userId): EntitlementsSnapshot` (para exponer en GraphQL/web, no para gatear)
- **Puntos de enforcement** (handler de application, nunca en el resolver):
    - Atleta: crear/aplicar template · crear mesociclo (propio) · generar draft IA (sesión y mesociclo)
    - Coach: invite-athlete (cap, **ya cableado**) · planificar sesión/asignar
      mesociclo a atleta (`plan_sessions`) · IA para atleta (la ejecuta el coach ⇒ su plan) · templates
    - **Solo se gatea el CREAR** (downgrade suave): leer/editar/completar lo que
      ya existe nunca se bloquea.

### Pasarelas (`infrastructure/gateways/`)

Puerto **`PaymentGateway`** con dos adapters (`StripeGateway`, `PayPalGateway`)
elegidos por parámetro `gateway` de la mutation; un `GatewayRegistry` los expone.
Superficie:

- `syncPlan(plan, price, offer?)` → ids externos (Stripe Product+Price(+Coupon);
  PayPal Product+Plan con trial cycles). Estado de sync guardado en la fila
  (`synced | pending | failed` + error) y reintentable desde admin.
- `createCheckout(user, price, offer?)` → **URL de redirección**
  (Stripe Checkout Session `mode=subscription`; PayPal `create subscription` →
  approve link). Success/cancel URLs → `webOrigin` (config ya existente).
- `cancelAtPeriodEnd(sub)` / `resume(sub)` (quitar el cancel antes de que venza)
- `changePlan(sub, newPrice)` — upgrade: prorrateo inmediato (Stripe nativo;
  PayPal `revise` con prorrateo limitado → si no lo soporta el caso, cancelar+alta
  documentado en el adapter); downgrade: se guarda `pendingPlanPriceId` y se
  aplica al renovar.
- `billingPortalUrl(user)` — **solo Stripe** (gestión de tarjeta); PayPal se
  gestiona en su web. El botón en la UI solo sale si `gateway === 'stripe'`.
- **Env nuevas** (todas **opcionales**, patrón `REDIS_URL`): `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`,
  `PAYPAL_WEBHOOK_ID`, `PAYPAL_ENV (sandbox|live)`. Sin keys de una pasarela ⇒
  esa pasarela no se ofrece en checkout (`GATEWAY_NOT_CONFIGURED`) y la app
  funciona en modo free/manual. Propagar a `infra/env/*.env.example` y composes.
- Deps nuevas: `stripe` (SDK oficial); PayPal vía REST con `fetch` (el SDK
  oficial de subscriptions está abandonado — **verificar estado al implementar**).

### Webhooks (REST, `presentation/`)

- `POST /webhooks/stripe` — **body crudo** para verificar firma
  (`stripe-signature`): necesita `express.raw()` en esa ruta (gotcha: el JSON
  parser global rompe la verificación). Eventos: `checkout.session.completed`,
  `customer.subscription.updated|deleted`, `invoice.paid`,
  `invoice.payment_failed`.
- `POST /webhooks/paypal` — verificación vía API (`verify-webhook-signature`)
  con `PAYPAL_WEBHOOK_ID`. Eventos: `BILLING.SUBSCRIPTION.ACTIVATED|UPDATED|
CANCELLED|SUSPENDED|EXPIRED`, `PAYMENT.SALE.COMPLETED`.
- Pipeline común: dedupe por `event_id` en `billing_webhook_events` → comando
  CQRS por tipo → actualizar `SubscriptionAggregate`/espejar `InvoiceEntity` →
  **integration events** en `src/shared/integration-events/`:
  `SubscriptionActivated/Changed/PastDue/CanceledIntegrationEvent`.
  Siempre **200 rápido** (el trabajo va detrás del bus); si el handler falla, el
  evento queda `failed` y es re-procesable.
- Consumidores de los integration events:
    - **notifications** (campana): pago fallido, suscripción activada,
      cancelación programada, “tu plan caduca el X”.
    - **realtime**: tipo nuevo `subscription_updated` → la web invalida
      `mySubscription`/entitlements.
    - **entitlements**: invalidar cache del usuario.
- **Cancelación iniciada en la plataforma** (Stripe portal / web de PayPal):
  entra por estos mismos webhooks ⇒ mismo camino que cancelar desde la app.
  El tiempo restante se respeta por la regla de entitlement (arriba).
- Dev: **Stripe CLI** (`stripe listen --forward-to`) y sandbox de PayPal con
  túnel; anotar en README/HANDOFF al implementar.

### GraphQL (presentation)

- Usuario: `availablePlans(audience)` (público) · `myEntitlements` ·
  `mySubscription` · `myInvoices(pagination)` · mutations
  `startCheckout(planPriceId, gateway, offerId?) → { url }` ·
  `cancelSubscription` · `resumeSubscription` · `changePlan(planPriceId)` ·
  `billingPortalUrl`.
- Admin (`AdminGuard`): `adminPlans` + CRUD (`createPlan`, `updatePlan` —
  features/límites en caliente—, `archivePlan`, `addPlanPrice`,
  `deactivatePlanPrice`, `upsertPlanOffer`, `syncPlanToGateways`) ·
  `adminAssignSubscription(userId, planId, until?)` (manual/comp) ·
  `adminSubscriptions(filtros+paginación)` · `adminInvoices` ·
  `adminBillingStats` (ver detalle en la sección del panel de admin) ·
  `adminGatewayStatus` (por pasarela: configurada, último webhook recibido,
  eventos fallidos, drift de la última reconciliación) ·
  `adminWebhookEvents(status, paginación)` + mutation `retryWebhookEvent(id)`
  (re-procesa un evento `failed` — la UI del replay que el pipeline ya permite).
- Inputs con **zod** (`ZodValidationPipe`), como todo lo externo.

### Web (`apps/web`)

- **`/account/plan`**: plan actual + catálogo del audience del usuario (toggle
  EUR/USD, intervalos, oferta visible), checkout (redirect a pasarela), cancelar
  (“conservas el acceso hasta el X”), reanudar, cambiar plan (copy distinto para
  upgrade —cobro prorrateado ya— y downgrade —al final del periodo—).
- **`/account/billing`**: facturas (número, fecha, importe, estado, link
  PDF/recibo), método de pago (portal Stripe si aplica).
- **`/admin/plans`**: tabla por audience; form dinámico de features (checks) y
  límites según el schema zod; precios por moneda×intervalo con versionado
  (desactivar+crear); ofertas; estado de sync por pasarela con botón re-sync.
- **`/admin/billing`** — el centro de mando de negocio (todo sale de
  `adminBillingStats`/`adminGatewayStatus`, los **mismos read-models que
  alimentan las gauges de Prometheus** — patrón coaching: admin y Grafana no
  pueden divergir):
    - **KPIs de negocio**: MRR (total y por plan/moneda) · suscripciones activas
      por plan y por gateway (Stripe vs PayPal vs manual) · trials en curso y su
      conversión del mes · `past_due` (cobros en recuperación) · cancelaciones
      programadas aún vivas (churn ya decidido) · altas por oferta del mes ·
      ingresos facturados del mes (suma de facturas `paid` espejadas, por moneda).
    - **Salud de integraciones (Stripe y PayPal, una tarjeta por pasarela)**:
      configurada sí/no (keys presentes) · último webhook recibido hace X
      (un silencio largo = endpoint roto, la señal más barata de detectar) ·
      eventos fallidos pendientes con lista y botón **reintentar**
      (`retryWebhookEvent`) · planes con sync `failed`/`pending` (link a
      `/admin/plans`) · **drift** de la última reconciliación (≠0 en rojo) ·
      link directo al dashboard de Stripe / a PayPal.
    - **Operación**: lista de suscripciones (filtros estado/plan/gateway,
      búsqueda por usuario, ver su historial de facturas) · facturas recientes ·
      asignación manual (comp).
    - Lo que es **serie temporal** (embudo de checkout, demanda de upgrade por
      feature, latencias) vive en Grafana, no se duplica aquí: deep-link al
      dashboard `powerlog-billing` vía `NEXT_PUBLIC_GRAFANA_URL` (patrón que ya
      usa `/admin`).
- **`/admin` (dashboard existente)**: fila nueva de KPIs de billing (MRR,
  activas, trials, past_due) junto a las de users/coaching/training, con link a
  `/admin/billing`.
- **Gating UX**: `FEATURE_NOT_IN_PLAN`/`PLAN_LIMIT_REACHED` → componente
  `UpgradeGate` (CTA a `/account/plan` con la feature que faltó). Los checks en
  cliente (`myEntitlements`) son solo UX; **la autoridad es el API**.
- Success/cancel de checkout: `/account/plan?checkout=success|cancelled`
  (el estado real llega por webhook + realtime, no confiar en el redirect).
- Tracked components + i18n es/en como el resto de la web.

### Observabilidad (parte de la feature)

Mismo patrón que coaching: puerto `BillingMetrics` (application) +
`PrometheusBillingMetrics` (infrastructure) + `FakeBillingMetrics` en doubles.
Cardinalidad acotada siempre: `gateway`/`status`/`type` son enums y **`plan` es
el slug del catálogo** (decenas como mucho, lo controla el admin) — jamás
userId/ids de pasarela. Los comandos CQRS ya se cuentan solos
(`CqrsInstrumentation`): no re-medir eso.

**Gauges de estado** (muestreadas en el `collect()` del scrape, **reutilizando el
read-model de `adminBillingStats`** — patrón coaching: cero SQL duplicado, admin
y Grafana no pueden divergir; query compartida + cache 5s):

- `powerlog_subscriptions{status,gateway}` — cuántas y por dónde entran (la
  dimensión `gateway` responde directamente “¿qué provider se usa más?”).
- `powerlog_subscriptions_by_plan{plan,audience}` — distribución del catálogo:
  qué planes venden y cuáles están muertos.
- `powerlog_mrr_cents{plan,currency}` — MRR aprox normalizando intervalos
  (quarter/3, year/12…). Por plan y moneda; el total es un `sum()` en Grafana.
- `powerlog_subscriptions_canceling` — con `cancelAtPeriodEnd=true` aún vivas:
  el churn **que ya está decidido pero todavía no se ve** en las canceladas.

**Counters de negocio** (en el handler correspondiente, no en el resolver):

- `powerlog_checkout_sessions_total{gateway,plan,status=started|completed|expired}`
  — embudo de conversión por pasarela y plan (started en `startCheckout`,
  completed/expired por webhook).
- `powerlog_subscription_events_total{type=activated|renewed|upgraded|downgraded|canceled|resumed|payment_failed|expired, gateway}`
  — el ciclo de vida entero; churn y recuperación de `past_due` se derivan aquí.
- **`powerlog_entitlement_denials_total{feature,audience}`** — la métrica de
  producto más valiosa del bloque: cada `FEATURE_NOT_IN_PLAN`/`PLAN_LIMIT_REACHED`
  es un usuario **pidiendo una feature que no paga** = demanda de upgrade por
  feature. (El `GlobalExceptionFilter` ya cuenta `domain_errors_total{code}`,
  pero sin la dimensión `feature`; este counter se incrementa en el adapter de
  `Entitlements` al denegar — un solo sitio — y no es double-logging: es otra
  dimensión.)
- `powerlog_offer_redemptions_total{plan}` — altas que entraron por oferta:
  mide si las promos convierten.
- `powerlog_billing_webhooks_total{gateway,type,status=processed|failed|duplicate}`
  — salud operacional del canal que sostiene todo lo demás; `duplicate` visible
  para verificar que la idempotencia trabaja.
- `powerlog_plan_sync_total{gateway,status}` — publicaciones de catálogo que
  fallaron contra la pasarela.

**Histogramas**: `powerlog_gateway_request_duration_seconds{gateway,operation}`
(checkout, cancel, sync, revise…) — latencia/errores de las llamadas salientes a
Stripe/PayPal, como ya se hace con mail/R2.

**Logs**: `info` en transiciones de suscripción, redenciones de oferta y sync de
planes (metadata estructurada: `subscriptionId`, `plan`, `gateway`); `error` en
webhooks fallidos con el `event_id`. Nada de PII ni payloads crudos.

**Métricas externas de Stripe/PayPal en Grafana**:

- **Stripe**: dos vías, no excluyentes — (a) el **plugin de datasource de Stripe
  para Grafana** (para paneles directos de balance/charges/subscriptions contra
  la API) y/o (b) un **`stripe-exporter` de Prometheus** en el compose de
  observabilidad (como el redis-exporter/postgres-exporter ya montados) para
  tener las series en Prometheus y poder alertar. Ambos son proyectos
  community: **verificar mantenimiento y permisos (restricted API key
  read-only) al implementar 9.5**; si ninguno está sano, el espejo local ya
  cubre el 90% del valor.
- **PayPal**: no existe exporter/datasource utilizable — la fuente práctica es
  nuestro espejo por webhook (las métricas de arriba ya llevan `gateway=paypal`).
- **Reconciliación (drift)** — más valiosa que cualquier exporter: job
  programado (BullMQ cuando entre, o cron simple) que lista las suscripciones
  activas en cada pasarela vía API y las compara con la DB →
  `powerlog_billing_drift{gateway}` (gauge; **alerta si > 0**). Un webhook
  perdido es la clase de bug silencioso que cobra mal durante semanas; esta
  gauge lo hace visible en horas y funciona igual para Stripe y PayPal.

**Dashboard** `powerlog-billing.json` (auto-provisionado, prefijo powerlog como
en pi-infra): fila de estado (subs por status/gateway/plan, MRR, canceling,
drift) · embudo checkout→activo por gateway y por plan · ciclo de vida
(activaciones, upgrades/downgrades, churn, payment_failed) · **demanda de
upgrade por feature** (denials) · ofertas · salud de webhooks y latencia de
pasarelas · si hay exporter de Stripe, fila con sus series externas.

### Testing (convenciones del repo)

- **Dominio puro**: reglas de plan (un free activo por audience, precio
  inmutable), regla de entitlement de la suscripción (canceled con periodo
  vigente ⇒ entitled; expirado ⇒ no), transiciones de estado, mapeo de ofertas.
- **Application**: in-memory repos + `FakePaymentGateway` (registra llamadas,
  URLs deterministas) en `tests/doubles/billing/`; mothers en
  `tests/mothers/billing/`. Casos: resolución free vs pago vs manual, downgrade
  suave (crear bloqueado, editar permitido), idempotencia de webhook, upgrade
  prorratea / downgrade programa.
- **Integración (Postgres real)**: constraints (una price activa por combo, una
  sub viva por user, unique de event_id), read-models de admin.
- **e2e**: flujo GraphQL con gateway fake + POST del webhook simulado (para
  Stripe, firmar el payload con el secret de test — la verificación de firma se
  ejerce de verdad); enforcement real: atleta free intenta crear mesociclo ⇒
  `FEATURE_NOT_IN_PLAN`, coach en el cap invita ⇒ `PLAN_LIMIT_REACHED`,
  webhook de activación ⇒ el mismo comando pasa.
- **Nunca** llamar a Stripe/PayPal reales en tests.

## Orden de implementación (sub-bloques con checkpoint)

1. **9.1 Catálogo + entitlements** — ✅ **HECHO** (881 tests verdes). Tablas + seed
   por migración (`0042`/`0043`) + `GetUserEntitlementsQuery` + `PlanAwareEntitlements`
   (rebind) + gates en los handlers existentes + errores + métrica de denials + tests.
   _Los límites ya son reales sin pasarela: todo el mundo en free/manual._
2. **9.2 Admin de planes** — CRUD dinámico API+web, asignación manual
   (comps), `adminBillingStats` básicos.
3. **9.3 Stripe end-to-end** — sync de catálogo, checkout, webhooks,
   suscripciones + facturas espejo, cancel/resume/changePlan, portal,
   `/account/plan` + `/account/billing`.
4. **9.4 PayPal end-to-end** — segundo adapter del mismo puerto + sus webhooks
   (la UI ya existe; se enciende el botón).
5. **9.5 Cierre** — notificaciones de billing (campana + realtime), dashboard
   Grafana `powerlog-billing.json`, **job de reconciliación + gauge de drift**,
   evaluación del exporter/datasource de Stripe, `/admin/billing` completo,
   docs/HANDOFF.

> Las **métricas van con cada sub-bloque**, no se dejan para el 9.5 (convención
> del repo: la observabilidad es parte de la feature): 9.1 trae
> `entitlement_denials`; 9.2 las gauges del read-model de admin; 9.3/9.4 los
> counters de checkout/ciclo de vida/webhooks y el histograma de pasarela de su
> gateway. El 9.5 solo añade lo transversal (dashboard, drift, exporter).

## Fuera de alcance (decidir más adelante)

- **Impuestos** (Stripe Tax / IVA por país): la factura espejo ya guarda lo que
  la pasarela emita; activar Stripe Tax es config, no modelo. Revisar antes de
  cobrar de verdad.
- **Reembolsos**: se ejecutan en el dashboard de la pasarela; el webhook
  refleja. Sin UI propia de refund en fase 1.
- **Cuotas medidas de IA** (p.ej. N generaciones/mes): el jsonb de límites lo
  permite; hoy IA es check booleano (BYOK, sin coste propio).
- **Multi-moneda más allá de EUR/USD** y cambio de moneda de una suscripción viva.
- Webhooks públicos en prod (pi-infra): exponer `POST /webhooks/*` en el proxy
  del Pi y registrar los endpoints en Stripe/PayPal — coordinar con `pi-infra`
  al desplegar 9.3/9.4.
