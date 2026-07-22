# Chat en tiempo real coach ↔ atleta

> **Planteamiento cerrado el 2026-07-21.** Diseño acordado con el usuario
> (decisiones abajo, tras revisar la infraestructura realtime existente).
> Implementar **por sub-bloques con checkpoint** como el resto del proyecto:
> generar un bloque, resumir, esperar OK. Nada de este documento está
> implementado todavía.

## Decisiones cerradas (no recuestionar sin motivo)

| Tema                                                      | Decisión                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transporte del chat                                       | **WebSocket dedicado** (elegido explícitamente por el usuario sobre el nudge-SSE recomendado). Ver el reparto de responsabilidades abajo — no sustituye el SSE existente.                                                                                                                                                        |
| Proceso y despliegue                                      | **HTTP y WS en el mismo proceso** (`powerlog-api`), expuesto en `api.powerlog.negri.es`. Multi-app solo para los futuros workers asíncronos. Detalle y alternativas descartadas en "Infraestructura y despliegue".                                                                                                               |
| Escrituras (enviar mensaje, marcar leído/entregado)       | Pasan **siempre por CommandBus**, nunca por el gateway directamente. El WS es una puerta de entrada más, no un segundo camino a la base de datos.                                                                                                                                                                                |
| Vista del atleta                                          | **Página de detalle simétrica**, `/coaching/coaches/[id]` (hoy no existe — el atleta solo ve una fila sin enlace en `/coaching`).                                                                                                                                                                                                |
| Historial tras desvincular (`removeAthlete`/`leaveCoach`) | **Se conserva para ambas partes, en solo lectura.** Mientras el vínculo existe: lectura y escritura. Roto el vínculo: la conversación sigue visible para los dos, pero nadie puede enviar más. Si se re-vincula, la misma conversación reabre para escritura (identidad estable por el par coach↔atleta, no por el link activo). |
| Alcance v1                                                | **Paridad completa de UI**: texto, contador de no leídos, presencia (online / última vez), doble check de entregado/leído, indicador de "escribiendo…". Ficheros/imágenes **fuera de esta fase** (ver más abajo cómo se deja el hueco).                                                                                          |
| Presencia                                                 | **Transversal, no solo del chat.** Sirve al chat (punto verde en la cabecera de la conversación) y al admin (`lastSeenAt` real en vez del proxy actual). Un único socket por pestaña, abierto para **todo** usuario autenticado — mismo razonamiento que ya vale para el SSE actual (ver "Punto de partida").                    |
| SSE existente                                             | **No se toca.** Notificaciones, billing, coaching (`session_planned`, etc.) siguen sobre SSE tal cual. El WS nuevo es un canal aparte, exclusivamente para presencia + chat. Fusionarlo con SSE es un refactor de transporte que no corresponde a este bloque — se deja anotado en "Fuera de alcance".                           |

## Punto de partida (ya existe — no rehacer)

- **Todo usuario autenticado ya mantiene una conexión persistente hoy.**
  `useRealtime` (`apps/web/lib/realtime/use-realtime.ts`) se monta una vez en el
  shell autenticado y abre un `EventSource` por pestaña, sea coach, atleta, o
  ninguno de los dos con vínculos. **Esto responde directamente a la duda de
  eficiencia**: el socket nuevo no es "un socket de chat para quien tiene
  atletas", es "la conexión realtime", de la que el chat es una feature más —
  exactamente el mismo razonamiento que ya sostiene el SSE actual, que ya sirve
  eventos de coaching/billing a todo el mundo sin distinción.
- **`RealtimeHub` / `RealtimeBus`** (`src/realtime/`): patrón de fan-out
  cross-instancia ya resuelto — `InMemoryRealtimeBus` de serie,
  `RedisRealtimeBus` cuando `REDIS_URL` está puesto (pub/sub, delivery
  local-first, `origin` para no auto-entregarse). El gateway de chat necesita el
  mismo problema resuelto para sus _rooms_; no se reutiliza el bus tal cual
  (está tipado a `RealtimeEvent` de un solo campo) pero si se usa Socket.IO, su
  **adaptador Redis oficial** (`@socket.io/redis-adapter`) resuelve exactamente
  esto para _rooms_ — mismo interruptor por `REDIS_URL` que ya usa el resto del
  proyecto (sin Redis: adaptador en memoria de Socket.IO, un solo proceso).
- **`CoachLinks`** (`shared/contracts/coach-links.ts`): puerto ya exportado por
  `coaching` (`areLinked(coachId, athleteId)`), consumido hoy por `workouts`.
  El módulo de chat lo consume igual para autorizar quién puede unirse a una
  conversación y quién puede escribir en ella.
- **`CoachLinkEstablishedIntegrationEvent`** /
  **`CoachLinkRemovedIntegrationEvent`** (`shared/integration-events/`): ya se
  publican al vincular/desvincular. El chat engancha un handler al primero para
  crear la conversación (igual que `notifications` engancha los suyos para el
  email/campana), y no necesita reaccionar al segundo — el vínculo se rompe,
  pero la conversación decide su estado de escritura consultando `CoachLinks`
  en el momento de enviar, no cacheando nada del evento.
- **`AdminUserAccount.lastSeenAt`** (`modules/auth/application/ports/admin-user.read-model.ts`)
  ya existe, pero es un **proxy**: el `max(created_at)` de `refresh_tokens`
  (login o refresh silencioso), calculado al vuelo. No hay presencia real ni
  columna durable hoy.
- **Notifications** es el análogo más cercano dentro del repo para el patrón
  CQRS de algo "tipo mensaje": paginación por cursor (`notification-cursor.ts`,
  base64url de `(createdAt, id)`), comandos `mark-read`, sin agregado rico (solo
  entidad + repositorio). El chat sigue el mismo nivel de ceremonia — los
  mensajes no tienen reglas de negocio complejas más allá de autorización y
  orden, no ameritan un `AggregateRoot`.
- **El atleta no tiene hoy vista de detalle de su coach.** `/coaching` (web)
  lista los coaches del atleta en `CoachRow` — una fila **sin `href`** — a
  diferencia de `UserRow` (atletas del coach), que sí enlaza a
  `/coaching/athletes/[id]`. La ruta simétrica no existe; hay que crearla.
- **El rail de chat ya tiene el hueco reservado** en
  `apps/web/app/(app)/(authed)/coaching/athletes/[id]/(detail)/layout.tsx`: el
  comentario de esa auditoría anterior marca literalmente dónde va
  (`grid-cols-[minmax(0,1fr)_22rem]` desde `xl`, oculto en pantallas más
  estrechas).

## Módulo nuevo: `src/modules/chat/` (Clean Architecture + CQRS)

### Dominio

- **`ConversationEntity`** — no agregado rico (como `NotificationEntity`):
  `id`, `coachId`, `athleteId` (par único — misma idea que `coach_athlete`),
  `createdAt`. Se crea **una vez, al vincular**, y sobrevive a un desvínculo
  (no se borra ni se re-crea: mismo par → misma conversación siempre, incluso
  tras re-vincular).
- **`MessageEntity`** — `id`, `conversationId`, `senderId`, `kind` (`'text'`
  hoy; enum reservado para `'image' | 'file'` — ver "Ficheros/imágenes,
  cuando toque"), `body` (texto; máx. **4000 caracteres**, escala similar a la
  nota privada del coach), `createdAt`.
- **`ParticipantStateEntity`** — el cursor de lectura/entrega **por
  participante**, no por mensaje: `conversationId`, `userId`,
  `lastDeliveredMessageId?`, `lastReadMessageId?`, `lastReadAt?`. Es el diseño
  que usan WhatsApp/Slack de verdad — un mensaje-por-mensaje de "leído" sería
  una escritura por cada mensaje que el otro lado escanea, un desperdicio. El
  doble check se **deriva** comparando `message.id`/`createdAt` contra el
  cursor del receptor, no se persiste por mensaje.
- **Errores** (`ChatError extends DomainError`):
  `CONVERSATION_NOT_FOUND` · `NOT_YOUR_CONVERSATION` (el viewer no es
  `coachId` ni `athleteId` de esa conversación) · `CONVERSATION_READ_ONLY`
  (vínculo roto — `sendMessage` lo comprueba con `CoachLinks.areLinked` en
  cada envío, no confía en el estado de la conversación) ·
  `MESSAGE_TOO_LONG` · `MESSAGE_EMPTY`.

### Aplicación

- **Comandos**: `SendChatMessageCommand` (valida longitud + `areLinked`,
  persiste, publica un evento de dominio) · `MarkConversationDeliveredCommand`
  · `MarkConversationReadCommand`. Los tres son la **única** vía de escritura,
  se llamen desde el resolver GraphQL o desde el gateway WS.
- **Queries**: `ListChatMessagesQuery` (cursor-paginado, mismo esquema que
  `notification-cursor.ts`) · `ListChatConversationsQuery` (la bandeja: para un
  coach, una fila por atleta con último mensaje + no-leídos + presencia; para
  un atleta, una fila por coach — misma forma, invertida).
- **Event handler**: `CreateConversationOnCoachLinkEstablished` — reacciona a
  `CoachLinkEstablishedIntegrationEvent`, crea la `ConversationEntity` si no
  existe (idempotente, igual que `link()` en `CoachLinkRepository`).
- **Puertos**: `Clock`, `IdGenerator` (reutilizar el patrón de coaching), y el
  puerto de push hacia el gateway (ver abajo — el módulo de chat no importa
  Socket.IO directamente; expone un `ChatPusher` abstracto que la
  infraestructura implementa contra el gateway, mismo espíritu que
  `RealtimeHub.publish()`).

### Persistencia (migraciones Drizzle nuevas)

- `chat_conversations`: `id`, `coach_id`, `athlete_id`, `created_at` — unique
  `(coach_id, athlete_id)`.
- `chat_messages`: `id`, `conversation_id`, `sender_id`, `kind` (`text` por
  ahora), `body`, **`attachment_url`/`attachment_mime`/`attachment_size`
  nullable, sin usar en v1** — reservados para no necesitar una migración que
  reescriba la tabla cuando llegue "subir ficheros o imágenes". `created_at`.
  Índice `(conversation_id, created_at, id)` para el cursor.
- `chat_participant_state`: PK `(conversation_id, user_id)`,
  `last_delivered_message_id?`, `last_read_message_id?`, `last_read_at?`.

### Presentación — el reparto WS / GraphQL

Dos puertas de entrada al **mismo** CommandBus, cada una con el trabajo que
sabe hacer bien:

- **GraphQL** (`chat.resolver.ts`, guardas y pipes de siempre —
  `JwtCookieGuard`, `ZodValidationPipe`): `sendChatMessage`,
  `markConversationRead`, `listChatMessages`, `listChatConversations`. Es la
  vía consistente con el resto del proyecto — reutiliza
  `GlobalExceptionFilter`, la instrumentación de CQRS, los tests de siempre —
  y el **fallback** si el socket no está conectado en ese momento (reconexión
  en curso, pestaña recién abierta).
- **WebSocket** (`chat.gateway.ts`, Socket.IO): el canal **vivo**. No toca la
  base de datos directamente — cada evento que causa un cambio de estado
  despacha el mismo comando (`chat:send` → `CommandBus.execute(new
SendChatMessageCommand(...))`), exactamente como hoy `RealtimeHub.publish()`
  lo llaman los _event handlers_, nunca al revés. Esto es lo que hace seguro
  añadir un segundo transporte: la lógica de negocio no se duplica, solo la
  puerta de entrada.

        A diferencia del hub SSE (deliberadamente "tonto": solo tipo, sin payload,
        porque cualquiera puede tener el stream abierto y la autorización real vive
        en los resolvers), **el gateway de chat sí autoriza por sala**: un socket
        solo hace `join` a `conversation:<id>` después de que el servidor compruebe
        que el usuario es `coachId`/`athleteId` de esa conversación. Por eso aquí sí
        es seguro llevar el cuerpo del mensaje en el evento — no es el mismo
        contrato que el SSE global, es un canal ya autorizado por sala.

        **Eventos servidor → cliente**: `chat:message` (mensaje completo, a la sala
        de la conversación) · `chat:typing` (efímero, no se persiste) ·
        `chat:delivered` / `chat:read` (avance del cursor del otro participante, para
        que el check pase a azul en vivo) · `presence:update` (`{ userId, online,

    lastSeenAt }`, **solo** a los sockets de usuarios vinculados a ese `userId` —
    nunca un broadcast global).

        **Eventos cliente → servidor**: `chat:join` (con comprobación de
        autorización) · `chat:send` · `chat:typing` (TTL de servidor ~6 s por si el
        cliente muere a media escritura) · `chat:delivered-ack` /
        `chat:read-ack`.

        **Autenticación del handshake**: mismo `TokenSigner.verifyAccessToken` que
        usa `JwtCookieGuard`, adaptado a un guard de WS que lee la cookie de
        `socket.handshake.headers.cookie` en vez de `req.cookies` — no se reinventa
        la verificación, solo el punto donde se lee el token.

        **Validación**: los mismos esquemas zod que ya existirían para los
        argumentos GraphQL, aplicados también en el gateway antes de construir el
        comando — el payload de un socket es entrada externa igual que un POST.

## `src/presence/` (módulo transversal nuevo, fuera de `src/modules/`)

Vive junto a `src/realtime/`, `src/auth/`, `src/shared/` por la misma razón que
ellos: código cruzado entre módulos que `eslint-plugin-boundaries` no debe
tratar como un módulo de negocio ajeno.

- **Un único gateway Socket.IO** (no uno por feature): el mismo socket que
  atiende `chat:*` atiende también el ciclo de vida de presencia — es la
  conexión realtime del usuario, el chat es una sala más dentro de ella.
- **Al conectar**: verificar JWT, incrementar un contador de refs por
  `userId` (Map en memoria de un proceso; en varios, un contador Redis para
  saber "¿está online en _algún_ proceso?" — mismo interruptor por
  `REDIS_URL`). Resolver el conjunto de "interesados" (para un coach: sus
  atletas vía `CoachLinkRepository.athleteIdsOf`; para un atleta: sus coaches)
  y emitirles `presence:update online=true` — nunca un broadcast global, ni
  siquiera dentro de esta app.
- **Al desconectar** (refs a 0, con un pequeño margen de gracia — 10-15 s, para
  no parpadear "offline" en un refresh de pestaña o una reconexión): persistir
  `lastSeenAt = now()` de forma durable y emitir `presence:update
online=false` al mismo conjunto de interesados.
- **`PresenceReader`** (puerto, patrón `CoachLinks`/`UserDirectory`):
  `isOnline(userId)`, `lastSeenAt(userId)`, variantes en bulk. Lo consume el
  chat (cabecera de la conversación) **y** `auth` (admin).
- **Tabla propia** `user_presence` (`user_id` PK, `last_seen_at`) — vive en la
  infraestructura de este módulo transversal, no en `users` (evita que
  `auth` tenga que saber de presencia; el read-model de admin la consulta vía
  el puerto, igual que ya hace con `ProfileSnapshotReader`).
- **Admin (`AdminUserAccount.lastSeenAt`)**: preferir el valor de
  `PresenceReader` cuando exista una fila; si no (usuario que nunca abrió el
  socket nuevo — todos los que iniciaron sesión antes de este despliegue),
  caer al proxy actual (`max(refresh_tokens.created_at)`). Se añade además
  `isOnline: boolean` al detalle de `/admin/users/[id]` — la ganancia directa
  que el usuario señaló, casi gratis una vez existe `PresenceReader`.

## Infraestructura y despliegue

### Decisión: un solo proceso para HTTP + WS

| Eje                                               | Decisión                                                                                                                         | Razón                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTTP + WebSocket                                  | **Un único proceso** (`powerlog-api`): Socket.IO montado con el `IoAdapter` de Nest sobre el mismo servidor HTTP, `path: '/ws'`. | El gateway despacha al **mismo CommandBus** (ver "Presentación"). Separarlo obliga a un salto de red hacia la API por cada `chat:send`, o a duplicar el grafo de módulos y el acceso a la base de datos. Coste real, cero ganancia.                                                                                                                                                                      |
| API ↔ workers asíncronos (IA local, otra máquina) | **Multi-app**: misma imagen, distinto entrypoint (`main.worker.ts` sobre un módulo reducido), lanzado con otro `command`.        | Un worker es un consumidor BullMQ (_pull_), no sirve sockets. `BullQueueFactory` (`src/queue/`) ya es la pieza. **No es un argumento para partir HTTP/WS**: un worker que termina un job no habla con el proceso WS por HTTP — publica en Redis y entrega el proceso que tiene el socket abierto (mismo seam que ya usa `RedisRealtimeBus`, y que `@socket.io/redis-adapter` resuelve para las _rooms_). |

**Cuándo revisitar**: si los redespliegues (watchtower) tirando todos los sockets
resultan molestos, o si la CPU del Pi sufre (`powerlog-api` tiene límite de
1.0 CPU / 512 MB). La salida entonces **no** es un servicio nuevo con su propio
contrato: es un segundo bootstrap del mismo código (`main.gateway.ts`), igual
que el worker.

### Exposición pública: `api.powerlog.negri.es`

La API ya está publicada en nginx-proxy-manager como
`https://api.powerlog.negri.es` → `powerlog-api:4000` (el front es
`https://powerlog.negri.es` → `powerlog-web:3000`). El navegador conecta el
socket **directamente a la API**, no a través del rewrite `/api/*` de Next
(`apps/web/next.config.ts:68`), porque **los rewrites de Next no reenvían el
`Upgrade` de WebSocket**. El SSE actual sí pasa por ahí porque es HTTP plano.

Las cookies no son un problema, y conviene entender por qué:

- **Origin distinto** (`powerlog.negri.es` ≠ `api.powerlog.negri.es`) ⇒ aplica CORS.
- **Mismo _site_** (dominio registrable `negri.es`) ⇒ `SameSite=Lax` **sí** envía
  la cookie en el handshake. No hace falta `SameSite=None`.
- **`COOKIE_DOMAIN=powerlog.negri.es`** ya está configurado
  (`infra/prod/powerlog-api.env.example`, aplicado en `auth-cookies.ts`), y
  `api.*` es subdominio suyo ⇒ `pl_at` ya viaja a la API hoy. **No se toca
  nada de auth**, y la cookie no se filtra a hermanos como `grafana.negri.es`.

Lo que sí hay que hacer, concreto:

1. **"Websockets Support" ON** en el proxy host `api.powerlog.negri.es` de NPM
   (viene apagado por defecto; sin eso el `Upgrade` responde 400).
2. En _Advanced_ de ese host, `proxy_read_timeout 3600s;`. El ping de Socket.IO
   (25 s) mantiene viva la conexión frente al corte de 60 s por defecto, pero no
   es un margen que interese apurar.
3. **`cors: { origin: WEB_ORIGIN, credentials: true }`** en el `IoAdapter`: el
   `enableCors` de `main.ts` no aplica a engine.io, que valida el `origin` aparte.
4. **`withCredentials: true`** en el cliente Socket.IO — sin esto el navegador no
   adjunta la cookie y el handshake entra como anónimo.
5. **`NEXT_PUBLIC_WS_URL`**: `https://api.powerlog.negri.es` en prod,
   `http://localhost:4000` en dev. No hay CSP en el proyecto, así que no hay
   `connect-src` que ajustar.

### Detalles de runtime

- **`transports: ['websocket']`**, sin fallback a long-polling. Elimina el
  requisito de _sticky sessions_ si algún día hay más de una réplica, y ahorra
  CPU en el Pi.
- **Shutdown**: `setupGracefulDrain` (`main.ts`) cierra las conexiones idle y
  arma un watchdog que mata el proceso con `exit 1` si el drain se pasa del
  presupuesto. Las conexiones WS son _long-lived_ ⇒ `server.close()` nunca
  resolvería y **cada deploy saldría con exit 1**. El gateway necesita un
  `beforeApplicationShutdown` que desconecte los sockets (`io.close()`), mismo
  precedente que `RealtimeHub.onApplicationShutdown` con los streams SSE.
- **Redis**: `powerlog-redis` (propio del stack, ya existente) para el
  `@socket.io/redis-adapter` y el contador de presencia, detrás del mismo
  interruptor `REDIS_URL` que el resto del proyecto. Sin Redis: adaptador en
  memoria, un solo proceso — modo soportado, igual que hoy.

## Web

- **Coach**: el rail ya tiene el hueco en el layout del detalle de atleta
  (`(detail)/layout.tsx`) — se rellena con `<AthleteChatRail athleteId={id}>`.
  Persistente entre secciones (Entrenamiento/Estadísticas/Planificar) desde
  `xl`; en pantallas más estrechas, una sección más en `AthleteNav` (con badge
  de no-leídos), no un rail.
- **Atleta**: ruta nueva `/coaching/coaches/[id]` (mismo patrón de route group
  `(detail)` que ya se usó del lado del coach), pero **sin tabs** — el atleta
  no tiene "Entrenamiento/Estadísticas/Planificar" que ver del lado del coach
  (su propio entrenamiento vive en `/workouts`), así que el chat **es** el
  contenido de la página, a ancho completo, bajo la cabecera de identidad del
  coach. `CoachRow` en `/coaching` gana el `href` que le falta.
- **Componentes de chat** (`components/chat/`): lista de burbujas
  (estilo-agrupado por remitente/minuto, como WhatsApp), composer con
  auto-resize, indicador "escribiendo…", punto de presencia + "última vez"
  relativo en la cabecera, doble check por mensaje derivado del cursor del
  otro participante. Un hook `useChatSocket` encapsula la conexión Socket.IO
  (paralelo a `useRealtime`, vive también en el shell autenticado — un socket
  por pestaña, para todo el mundo) + un `useConversation(conversationId)` que
  combina el query GraphQL (historial, carga inicial) con los eventos en vivo
  del socket (mensajes nuevos, typing, presencia, ticks).
- **Bandeja**: el roster (`UserRow`/`CoachRow` en `/coaching`) gana un badge de
  no-leídos por fila — no hace falta una página de "bandeja" separada, el
  roster ya cumple ese papel dado el número de atletas/coaches por usuario.

## Ficheros/imágenes, cuando toque (no en esta fase)

El esquema ya lo deja barato: `chat_messages.kind` es un enum desde el día uno
(`text` hoy), y `attachment_url`/`attachment_mime`/`attachment_size` existen
como columnas nullable sin uso. Cuando se aborde, la subida en sí seguirá el
patrón ya resuelto para el avatar (`R2` + procesado de imagen) — añadir un
`kind: 'image' | 'file'` real es una migración aditiva, no una que toque las
filas existentes.

## Observabilidad

- **Métricas** (`observability/metrics.ts`, mismo patrón que
  `realtimeConnections`/`realtimeEvents`):
  `powerlog_chat_ws_connections` (gauge) · `powerlog_chat_messages_total{status=sent|blocked}`
  (counter — `blocked` cuenta los `CONVERSATION_READ_ONLY`, ya reflejados
  también en `domain_errors_total`, pero esta dimensión es específica de
  chat) · `powerlog_presence_online_users` (gauge, tamaño del set online).
- **Logs**: `info` en creación de conversación y en el evento de dominio de
  envío (metadata: `conversationId`, **nunca** `body` — misma regla que el
  resto del proyecto); `debug` en connect/disconnect del socket (volumen alto,
  no operacionalmente interesante salvo depurando); nunca se loggea el cuerpo
  de un mensaje.
- **Scrape: nada nuevo.** Al vivir el gateway en `powerlog-api`, las métricas
  salen por el `/metrics` que Prometheus ya scrapea — ni un job nuevo en
  `scrape.d`, ni un target más. Es una ventaja concreta del mono-proceso frente
  a un servicio WS aparte, que habría exigido su propio scrape, su propio
  dashboard y su propia regla de alerta.
- **Trazas**: OTel **no instrumenta Socket.IO**. El comando despachado desde el
  gateway sí genera span (`CqrsInstrumentation`), pero huérfano — sin padre que
  diga de qué evento de socket vino. Para `chat:send` (el único camino con
  escritura) el gateway abre un span manual `chat.ws chat:send` como padre antes
  de despachar; el resto de eventos (`typing`, `join`) no lo merecen.
- **Dónde mirar cuando el handshake falle**: los errores de _upgrade_ los
  devuelve nginx-proxy-manager, que vive en el stack **core** y no está en
  `powerlog-net` ⇒ **no aparecen en el Loki de powerlog**. Depurar un 400 en el
  handshake es mirar los logs del contenedor de NPM, no Grafana. Merece la pena
  anotarlo en el README de `infra/prod/` cuando se implemente Chat.2.
- **Alerta** (Chat.5, con datos reales de por medio): `powerlog_chat_ws_connections`
  cayendo a 0 mientras hay tráfico HTTP es la señal de "el proxy dejó de pasar
  upgrades" — el modo de fallo más probable de esta infra, y silencioso, porque
  la app sigue respondiendo 200. Va en `observability/prometheus/rules/powerlog-alerts.yml`.

## Testing (convenciones del repo)

- **Dominio puro**: reglas de longitud/vacío del mensaje, derivación del
  doble-check a partir del cursor del receptor.
- **Application**: repos in-memory (`tests/doubles/chat/`) + `FakeClock` +
  un `FakeChatPusher` (registra qué se hubiera empujado, sin gateway real).
  Casos: enviar bloqueado tras desvínculo (`CONVERSATION_READ_ONLY`), la
  conversación se crea al vincular (idempotente), listar mensajes pagina por
  cursor igual que notifications.
- **Integración (Postgres real)**: el unique `(coach_id, athlete_id)`, el
  cursor de `chat_messages`, la PK compuesta de `chat_participant_state`.
- **e2e**: `sendChatMessage` bloqueado tras `removeAthlete`/`leaveCoach`, con
  historial previo aún legible vía `listChatMessages`. El gateway WS se
  ejercita con un cliente Socket.IO real contra el server de test (no mock del
  transporte) para al menos: handshake autenticado, `chat:join` rechazado si
  no está vinculado, `chat:message` recibido en la sala tras un `chat:send`.
- **Nunca** un mensaje real de negocio (biografía de usuario, etc.) en los
  fixtures — solo texto de prueba genérico.

## Orden de implementación (sub-bloques con checkpoint)

1. **Chat.1 — Dominio + aplicación + persistencia, sin transporte.**
   Entidades, comandos/queries, migraciones, repos Drizzle, el event handler
   que crea la conversación al vincular. Expuesto **solo por GraphQL** de
   momento (sin gateway todavía) — así el grueso de la lógica se prueba con
   los tests baratos (dominio/application) antes de tocar sockets.
2. **Chat.2 — `src/presence/` + el gateway WS (sin UI todavía).**
   Socket.IO montado, guard de handshake, ciclo de vida de conexión/presencia,
   `PresenceReader`, y las salas de conversación con `chat:join`/`chat:send`/
   `chat:typing` despachando al mismo CommandBus del Chat.1. Adaptador Redis
   detrás de `REDIS_URL`, igual que el resto del proyecto.
   **Incluye la infra** (ver "Infraestructura y despliegue"): _Websockets
   Support_ + `proxy_read_timeout` en el proxy host `api.powerlog.negri.es`,
   `NEXT_PUBLIC_WS_URL` en los `.env.example` de ambos repos, y el
   `beforeApplicationShutdown` que desconecta sockets — sin este último, cada
   deploy sale con `exit 1`.
3. **Chat.3 — Admin: `isOnline` + `lastSeenAt` real en `/admin/users/[id]`.**
   Bloque pequeño y aislado, buen punto para verificar `PresenceReader` en
   producción antes de construir la UI de chat encima.
4. **Chat.4 — Web: ruta simétrica del atleta + rail del coach + componentes
   de chat.** `useChatSocket`, `useConversation`, burbujas, composer, typing,
   presencia, doble check, badge de no-leídos en el roster.
5. **Chat.5 — Cierre.** Métricas del bloque completo, dashboard/paneles si
   aplica, HANDOFF.md actualizado, revisión de carga (cuántos sockets abre un
   despliegue típico, coste real del segundo transporte por pestaña).

## Fuera de alcance (decidir más adelante)

- **Ficheros/imágenes** — el esquema los deja baratos (ver arriba), pero la
  subida, el procesado y la UI de adjuntos son un bloque propio.
- **Fusionar el WS nuevo con el SSE existente en un único transporte.** Tener
  dos conexiones persistentes por pestaña es un coste real, pero unificarlas
  es un refactor de todo lo que ya corre sobre SSE (notificaciones, billing,
  coaching) — no corresponde colarlo dentro de un bloque de chat.
- **Chat grupal** (más de coach+atleta en una conversación) — el modelo actual
  asume el par exacto de `coach_athlete`.
- **Editar/borrar mensajes enviados.**
- **Búsqueda dentro del historial de chat.**
- **Rate limiting de envío** (flood de mensajes) — anotado para endurecer en
  Chat.5 si hace falta, no bloqueante para la v1. **Ojo si se aborda**: no hay
  `app.set('trust proxy')` en la API, así que Express ve la IP de NPM y el
  `ThrottlerModule` mete a todos los usuarios en el mismo cubo. Es un problema
  preexistente (hoy todo el tráfico entra ya desde el contenedor `powerlog-web`),
  pero cualquier límite por IP sobre el chat heredaría el defecto.
- **Redis alcanzable desde otra máquina** — los workers de IA asíncrona
  necesitarán llegar a `powerlog-redis`, que hoy está solo en `powerlog-net`,
  sin puerto de host y sin password. Hace falta `requirepass` + bind a la
  interfaz de Tailscale/LAN (nunca `0.0.0.0`), y lo mismo para PgBouncer si el
  worker escribe. Es un bloque de infra propio, previo a esas features y ajeno
  al chat — pero es la razón por la que el chat no necesita partir el proceso
  (ver "Infraestructura y despliegue").
- **Notificaciones push del navegador/móvil con la app cerrada** (Web Push) —
  el chat vive mientras haya un socket abierto; sin eso, un mensaje nuevo solo
  se ve al volver a abrir la pestaña (el badge de no-leídos del roster ya lo
  cubre para ese caso).
