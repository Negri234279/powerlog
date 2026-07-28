# Plan — Notificaciones push (Web Push + PWA)

> Documento de diseño. **Aún no hay código.** Añade un **tercer canal de fan-out**
> —web push— hermano de la campana y del SSE, para reenganchar al usuario con la
> **app cerrada** (móvil sobre todo): chat, coach programa sesión, cola de IA lista.
> Se hace por sub-bloques con checkpoint, como el resto del HANDOFF.

## El encaje (por qué NO copiamos el ejemplo de Next)

La [guía PWA de Next](https://nextjs.org/docs/app/guides/progressive-web-apps) pone
la lógica de push en **Server Actions de Next** con la suscripción **en memoria**.
En powerlog eso estaría mal: **la API NestJS ya es la dueña de las notificaciones**.
Hoy cada integration event de dominio se abre en abanico a dos canales paralelos:

- **Campana** — `modules/notifications/` → `notify-on-*.handler.ts` (persistida).
- **SSE realtime** — `src/realtime/` → `push-on-*.handler.ts` (refresco en vivo de la
  pestaña abierta; el evento lleva **solo `{type}`**, el cliente refetchea por GraphQL).

**Web push es literalmente un tercer hermano de esos dos.** Va en la API. Next solo
pone la **parte cliente** (manifest + service worker + botón de suscribir + deeplink).

### La diferencia de diseño que manda: el payload
El SSE no lleva PII porque el cliente está abierto y refetchea. **El push no puede
hacer eso**: renderiza texto en la pantalla bloqueada con la app cerrada, así que el
payload **lleva título + cuerpo + deeplink**. Eso cruza una línea que el SSE evitaba.

## Decisiones cerradas

| Tema | Decisión |
| --- | --- |
| Dónde vive la entrega | **API NestJS**, módulo transversal `src/push/` (rango de `src/realtime`, `src/presence`) |
| Qué dispara el push | Los **mismos integration events** que ya alimentan campana+SSE, con handlers `push-on-*` calcados (frontera limpia: push **no** depende de notifications) |
| Contenido del payload | **Útil pero mínimo, localizado** (es/en). "Tu coach programó una sesión el 30/07", no "Tienes una notificación" |
| Idioma | Se resuelve el texto **al enviar**, con el `locale` guardado en la suscripción (fallback a `en`) |
| Chat + presencia | **Solo push si el destinatario NO está online por WS** (usa `OnlineRegistry`). Evita doble aviso con la app abierta |
| Librería | `web-push` (estándar VAPID). Único fichero que la importa: `PushSender` |
| Modo opcional | Sin claves VAPID en el env ⇒ canal apagado, la app sigue igual (patrón Redis/Stripe) |
| Multi-dispositivo | Un usuario tiene **N suscripciones** (fila por `endpoint`). Endpoint muerto (404/410) ⇒ se borra |
| Env privada | `VAPID_PRIVATE_KEY` solo en `config/env.ts`; pública `NEXT_PUBLIC_VAPID_PUBLIC_KEY` al cliente |

## La restricción que domina la UX: iOS

- **iOS solo soporta web push desde 16.4 y SOLO con la app instalada** en la pantalla
  de inicio (modo `standalone`). En Safari normal **no hay push**.
- **iOS no ofrece prompt de instalación**: el usuario hace manualmente *Compartir →
  Añadir a pantalla de inicio*. Necesitamos un `InstallPrompt` que detecte iOS y lo
  explique (la doc trae el patrón).
- El permiso se pide **después** de instalar y **desde un gesto del usuario** (botón).
- Android/Chrome/Firefox: funciona sin instalar y ofrecen prompt.

⇒ El toggle de "Activar notificaciones" en la web tiene que **degradar con gracia**:
detectar soporte, detectar standalone en iOS, y guiar al usuario en cada caso.

## Modelo de datos (API)

Tabla `push_subscriptions` (migración nueva):

| Columna | Tipo | Nota |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | uuid | referencia blanda a users (como `subscriptions`); indexado |
| `endpoint` | text | **único** (el navegador lo rota; upsert por endpoint) |
| `p256dh` | text | clave pública del cliente |
| `auth` | text | secreto del cliente |
| `locale` | text | `es`/`en`, para localizar el texto al enviar |
| `user_agent` | text nullable | diagnóstico / futura UI "tus dispositivos" |
| `created_at` / `last_seen_at` | timestamptz | |

Índice único en `endpoint`; índice en `user_id` (fan-out por usuario).

## Casos de uso → eventos que YA existen

| Caso | Disparador | Estado hoy |
| --- | --- | --- |
| Coach programa sesión | `WorkoutSessionPlannedIntegrationEvent` | ya tiene campana + SSE; añadir `push-on-*` |
| Coach asigna mesociclo | `MesocycleAssignedIntegrationEvent` | idem |
| Cola de IA lista | `AiGenerationSettledIntegrationEvent` | ya es integration event ("Tu plan de IA está listo") |
| Invitación de coach | `CoachInvitationCreatedIntegrationEvent` | idem |
| Suscripción / pago fallido | `SubscriptionChangedIntegrationEvent` | pago fallido es el que más importa |
| **Chat** | **`ChatPusher.messagePosted`** (no es integration event) | ver Push.4 |

**Chat es especial**: no emite integration event, va por el puerto `ChatPusher`
(`send-chat-message.handler.ts:89`). El push se engancha ahí, **guardado por
presencia**: si el destinatario tiene socket vivo, no se envía push.

## Sub-bloques (con checkpoint)

### Push.1 — Cimientos API (sin disparadores todavía) ✅ HECHO
> **Completado.** Módulo transversal `src/push/` (fuera de `src/modules`, como
> `realtime`/`presence`): tabla + migración `0066`, `PushSubscriptionStore` +
> adaptador Drizzle (upsert por endpoint), `PushTransport` (`web-push`, `WebPushTransport`
> / `NoopPushTransport` según haya VAPID), `PushNotifier`/`PushService` (fan-out
> best-effort + poda de endpoints 404/410 + métrica `powerlog_push_sent_total{status}`),
> resolver GraphQL (`pushPublicKey`, `registerPushSubscription`, `removePushSubscription`),
> env `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` (opcionales). **25 tests
> nuevos** (service, resolver, transport con `nock`, integración Postgres, e2e); typecheck
> + lint + format verdes. `web-push@3.6.7` + `@types/web-push@3.6.4`.

Lo que se implementó:
- Módulo `src/push/`: tabla + migración, repositorio Drizzle, `PushSender`
  (`web-push`, firma VAPID, borra endpoint muerto en 404/410).
- Puerto de escritura desde la web: mutaciones GraphQL `registerPushSubscription`
  (upsert por endpoint, guarda `locale`+`userAgent`) y `removePushSubscription`.
- Env nuevas (opcionales): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
  (`mailto:`). Sin ellas, `PushSender` es no-op y las mutaciones responden "no
  soportado" limpio.
- Métrica `powerlog_push_sent_total{status=sent|failed|expired}` +
  `powerlog_push_subscriptions` (gauge).
- **Tests**: unit del `PushSender` (payload firmado, endpoint muerto ⇒ borrado),
  integración Postgres del repo (upsert por endpoint, multi-dispositivo), e2e de las
  mutaciones (registrar/borrar, sin claves ⇒ respuesta de no-soportado).
- **Checkpoint**: typecheck + lint + tests verdes. Nada visible aún.

### Push.2 — PWA en la web (instalable, sin push aún) ✅ HECHO
> **Completado.** `app/manifest.ts` (standalone, tema obsidiana `#07070a`), iconos
> generados desde el SVG de marca (`public/icons/` 192/512/maskable-512/badge-72 +
> `app/apple-icon.png`), `public/sw.js` (push → `showNotification`, `notificationclick`
> → enfoca pestaña abierta y navega, o abre una; colapsa por `tag`), `headers()` en
> `next.config` para `/sw.js` (`no-cache` + `Service-Worker-Allowed: /`), y
> `ServiceWorkerRegistrar` (cliente headless) montado en `Providers` (registra en toda
> la app). Web **typecheck + build verdes** (`/manifest.webmanifest` sale en las rutas).
> **Desviación del plan**: el `InstallPrompt` + el hook `use-install-state` se mueven a
> **Push.3**, donde van junto al toggle en `/profile` (misma superficie, misma detección
> iOS/standalone). Falta validación manual de instalación en un móvil real.

Lo que se implementó:
- `app/manifest.ts` (nombre, `display: standalone`, `theme_color`, iconos 192/512/
  maskable). Iconos reales en `public/`.
- `public/sw.js`: `push` → `showNotification(title, {body, icon, badge, data})`;
  `notificationclick` → `clients.openWindow(data.url)` (deeplink) reusando pestaña
  abierta si la hay.
- Headers de `sw.js` en `next.config` (Content-Type, `no-cache`, CSP del SW).
- `InstallPrompt` (detecta iOS/standalone) en un sitio discreto.
- **Checkpoint**: la web se instala en móvil (Android + iOS), el SW se registra.
  Verificación manual en el móvil (con `--experimental-https` en local).

### Push.3 — Cablear la suscripción (web ↔ API) ✅ HECHO
> **Completado.** `lib/graphql/operations/push.ts` (`pushPublicKey`/`register`/`remove`)
> + `lib/pwa/use-install-state.ts` (isIOS/isStandalone) + `lib/pwa/use-push-notifications.ts`
> (permiso → `pushManager.subscribe` con la clave del `pushPublicKey` → mutación; estado en
> un enum `PushStatus`). `NotificationsCard` en `/profile/security` pinta cada estado
> (loading/off/on/denied/unsupported/unavailable/**ios-needs-install** con la guía de
> "Añadir a pantalla de inicio" inline). i18n **es/en** completo, `TrackedButton`. Codegen +
> typecheck + **build de la web verdes**. Degrada solo: sin VAPID en el API la card muestra
> "no disponible". Falta la prueba manual del flujo completo en un móvil real.

Lo que se implementó:
- Toggle "Activar notificaciones" en `/profile` (o en el shell): gesto de usuario →
  `Notification.requestPermission()` → `pushManager.subscribe(applicationServerKey)`
  → mutación `registerPushSubscription`. Desactivar ⇒ `unsubscribe` + mutación.
- Manda el `locale` actual del usuario y detecta soporte/standalone (mensajes
  distintos: no soportado / iOS-instala-primero / permiso denegado).
- **Checkpoint**: suscripción real guardada en la BD desde un móvil.

### Push.4 — Disparadores (los casos de uso) ✅ HECHO
> **Completado.** `PushNotifier.send` acepta ahora un **factory `(locale) => PushPayload`**
> y `PushService` lo renderiza **por dispositivo** (locale guardado en la suscripción).
> Copia es/en en `src/push/push-copy.ts`. Handlers en `src/push/event-handlers/`:
> `push-on-session-planned`, `push-on-mesocycle-assigned`, `push-on-coach-invitation`
> (solo si el invitado ya tiene cuenta), `push-on-ai-generation-settled` (solo en éxito;
> deeplink a la draft de session_plan, resto a `/workouts/ai`), y `push-on-chat-message`
> **con guard de presencia** (`OnlineRegistry`: si el destinatario está online, no hay push;
> deeplink a su lado de la conversación). El chat estrena `ChatMessageSentIntegrationEvent`
> publicado por `SendChatMessageHandler` (así el chat no importa el módulo push). `PushModule`
> importa `PresenceReadModule` (OnlineRegistry compartido con el gateway) + `AuthModule`
> (UserDirectory). **+17 tests** (handlers, factory-form, guard de presencia, evento de chat);
> **suite completa 1416 verde**, typecheck/lint/format OK. Con las VAPID keys ya puestas en el
> API, el push sale de verdad — falta la prueba manual en un móvil real.

Lo que se implementó:
- `push/event-handlers/` con `push-on-session-planned`, `push-on-mesocycle-assigned`,
  `push-on-ai-generation-settled`, `push-on-coach-invitation`, `push-on-subscription-changed`
  — calcados de los de realtime, pero construyendo **título+cuerpo+deeplink localizados**.
- Un `PushCopy` (es/en) que traduce `type + data → {title, body, url}`. Reusa las
  claves i18n que ya tiene la web si tiene sentido, o catálogo propio en la API.
- **Chat**: adaptador de push detrás del mismo seam que el WS. En
  `send-chat-message.handler`, tras el fan-out por WS, **consultar presencia**
  (`OnlineRegistry`) del destinatario: si NO está online ⇒ `PushSender.send`.
  Colapsar por `tag = conversationId` en el SW (no apilar 10 push del mismo chat).
- **Tests**: cada handler (usuario correcto, texto localizado es/en), y el de chat
  (online ⇒ no push; offline ⇒ push) con el `OnlineRegistry` real/doble.
- **Checkpoint**: los 3 casos que pediste llegan al móvil con la app cerrada.

### Push.5 — Cierre
- Alerta si `powerlog_push_sent_total{status="failed"}` sube de forma sostenida
  (VAPID mal configurada, proveedor caído).
- Limpieza periódica de suscripciones sin `last_seen_at` reciente (opcional).
- Panel mínimo en Grafana (enviados/fallidos/expirados, suscripciones activas).
- Doc en `infra/README.md`: cómo generar las VAPID keys, rotación, iOS caveat.

## Trampas conocidas (anticiparlas)

- **Rotar VAPID invalida TODAS las suscripciones existentes.** Generar una vez y
  tratarlas como secreto estable (como el resto del env). Documentarlo.
- **El endpoint del navegador rota o muere**: `web-push` devuelve 404/410 ⇒ borrar la
  fila **en el sitio del envío** (si no, se acumulan endpoints zombis y las métricas
  de "failed" mienten).
- **iOS: sin standalone no hay push.** El toggle debe detectarlo y no prometer lo que
  el navegador no puede dar.
- **Doble aviso**: sin el guard de presencia, con la app abierta el usuario recibe el
  SSE/WS **y** el push. Por eso el chat mira presencia; para los demás eventos, el SW
  puede colapsar por `tag` y no re-notificar lo que ya está en pantalla.
- **CSP del SW**: `next.config` necesita `Content-Type` y `Cache-Control: no-cache`
  para `/sw.js`, o el navegador sirve una versión vieja del worker.
- **HTTPS obligatorio** también en local para probar: `next dev --experimental-https`.
- **Prod pi-infra**: instancia única ⇒ sin fan-out cross-instancia que resolver ahora.
  Si algún día hay réplicas, el envío es stateless (lee la tabla), así que escala solo.

## Qué NO entra (conscientemente)

- Notificaciones **agrupadas/resumen** ("3 mensajes nuevos") — v2.
- Preferencias finas por tipo de evento (silenciar solo chat, etc.) — v2; de momento
  un único opt-in global por dispositivo.
- Offline / background sync (Serwist) — es otra feature, no notificaciones.
- Badge count en el icono de la app (`setAppBadge`) — v2.
