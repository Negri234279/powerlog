# Mejoras de la planificación con IA (sesión y mesociclo)

> **Propuesta, no plan cerrado.** Redactada tras revisar `src/modules/ai/`
> completo (prompts, parsers, conversación, contexto, adaptadores). Hay una
> sección de **decisiones abiertas** que necesita respuesta antes de tocar los
> bloques que dependen de ellas. El resto se puede implementar tal cual.
> Implementar **por sub-bloques con checkpoint** como el resto del proyecto:
> un bloque, resumen, esperar OK. Nada de este documento está implementado.

## Qué se propone, en una tabla

| #     | Bloque                                       | Coste | Por qué importa                                                                 | Depende de |
| ----- | -------------------------------------------- | ----- | ------------------------------------------------------------------------------- | ---------- |
| IA.1  | Métricas de calidad del draft                | Bajo  | Sin esto, cualquier cambio posterior es opinión: no sabréis si mejora o empeora | —          |
| IA.2  | Validación semántica en los parsers          | Bajo  | El retry ya existe; hoy solo rechaza JSON malformado, no programación mala      | —          |
| IA.3  | Prompt caching del catálogo                  | Medio | El catálogo (274 líneas) se reenvía entero en cada generación y refinamiento    | —          |
| IA.4  | Structured outputs                           | Medio | Elimina la clase de fallo "JSON inválido" y el reintento que cuesta una llamada | —          |
| IA.5  | Cargas calculadas en backend, no por el modelo | Medio | Es aritmética pura y el LLM la hace mal y de forma no determinista            | IA.2       |
| IA.6  | Contexto: fatiga, tendencia, perfil, equipamiento | Alto | Más señal por token; hoy faltan los datos que un entrenador miraría primero  | Decisiones abiertas |
| IA.7  | Progresión multi-semana del mesociclo        | Alto  | Hoy un "mesociclo" es una semana clonada N veces: sin periodización            | IA.5       |
| IA.8  | Modelo y parámetros por tipo de tarea        | Medio | Diseñar un bloque y progresar una sesión no son la misma dificultad            | IA.3       |

**Orden recomendado: IA.1 → IA.2 → IA.3 → IA.4 → IA.5 → IA.6 → IA.7 → IA.8.**
Los tres primeros son baratos y dan la instrumentación para juzgar los demás.

## Punto de partida (ya existe — no rehacer)

- **La arquitectura del módulo está bien.** `AiConversation.ask` centraliza el
  turno con el proveedor (descifra la key, publica `AiUsageRecordedEvent`,
  reintenta una vez con el motivo), `AiProviderResolver` resuelve la config,
  `MesocycleDesigner` / `SetPrescriber` son fachadas finas, y los parsers son la
  única puerta por la que la respuesta del modelo llega al dominio. Nada de este
  documento pide cambiar ese reparto.
- **La defensa contra prompt injection ya está pensada.** El texto del atleta
  viaja envuelto en `<athlete_request>` y etiquetado como datos
  (`mesocycle-prompt.service.ts:99`), los parámetros que deciden la forma del
  bloque viajan fuera, y `rationale` está capado a 600 caracteres. No tocar sin
  motivo — cualquier prompt nuevo de este documento hereda esas reglas.
- **`ModelAnswerRejection` + `buildRetryPrompt`** (`model-answer.ts`,
  `ai-conversation.service.ts:22`) es el mecanismo de reintento con motivo
  concreto. **IA.2 se cuelga entero de aquí**: no hay que construir nada nuevo,
  solo lanzar más rechazos desde los parsers.
- **`ai_generations`** ya guarda `request` (jsonb), `draft_id`, `failure_code` y
  `scope_key` con un índice único parcial que impide dos trabajos en vuelo por
  scope. La historia de qué se pidió está persistida — buena base para el golden
  set de IA.1.
- **`PlanDraftStatusVO`** distingue `open` / `accepted` / `discarded`, y los
  drafts guardan el hilo de refinamiento (`AiPlanMessageEntity`, máximo 20
  turnos). **Esa es la métrica de calidad y todavía no se mide.**
- **`AiGenerationMetrics`** (puerto) + `PrometheusAiGenerationMetrics` +
  `METRIC.aiGenerationsQueued` / `aiGenerationDuration` en
  `observability/metrics.ts`. Añadir métricas es extender el puerto y declararlas
  ahí; el patrón está resuelto.
- **`LlmProviderClient`** es agnóstico de key por diseño (BYOK). `listModels`
  dobla como verificación de key. Los adaptadores (`anthropic.provider-client.ts`,
  `openai.provider-client.ts`) construyen un cliente por llamada.
- **`static-model-pricing.ts`** tiene la tabla de precios por modelo. Habrá que
  ampliarla en IA.3 (ver ahí).
- **Taxonomía de ejercicios** (`workouts/domain/exercise-taxonomy.ts`):
  9 categorías, 5 equipamientos (`barbell` · `dumbbell` · `machine` · `cable` ·
  `bodyweight`), 11 músculos primarios. **Es lo que hace viable el validador de
  IA.2 y el filtro por equipamiento de IA.6** — el volumen por grupo muscular se
  puede calcular sin inventar nada.

## Decisiones abiertas (bloquean IA.6 y parte de IA.7)

| Tema                            | Pregunta                                                                                                                                                             | Recomendación                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Peso corporal                   | No existe en el esquema. `profiles` tiene `birthDate`, `sex`, `heightCm` y nada más. Sin peso no hay ratios de fuerza relativa ni prescripción sensata en calistenia. | Tabla nueva `body_measurements` (serie temporal, no columna en `profiles`) — es un bloque propio, ver "Fuera de alcance".         |
| Equipamiento disponible         | Hoy se ofrecen los 274 ejercicios del catálogo a todo el mundo, entrene en un gimnasio completo o en casa con mancuernas.                                             | Campo en el perfil: subconjunto de `EXERCISE_EQUIPMENT`. Barato (5 valores, un enum que ya existe) y de los que más calidad dan.  |
| Nivel de experiencia            | No existe. Cambia todo: progresión lineal vs ondulante, volumen tolerable, selección de ejercicios.                                                                   | Enum `beginner` / `intermediate` / `advanced` en el perfil. Se puede derivar del historial, pero preguntar es más fiable y barato. |
| Lesiones / limitaciones         | No existe. Un atleta con hombro tocado no debería recibir press militar y hoy no hay forma de decirlo salvo en el texto libre.                                        | Texto libre estructurado en el perfil, inyectado en el prompt como dato. Nota: hereda el tratamiento de `<athlete_request>`.       |
| ¿Modelo por tipo de tarea?      | `ai_provider_configs` guarda un `model` por proveedor. IA.8 propone uno por `kind`.                                                                                   | Sí, pero con default sensato: si no hay modelo por tarea, cae al del proveedor. Migración aditiva, sin romper configs existentes.  |
| ¿Se toca la UI del builder?     | IA.7 cambia lo que devuelve el modelo (semana + progresión, no solo semana). El cliente hoy replica la semana él mismo.                                               | Sí, es inevitable — pero la expansión pasa al backend, así que el cliente **simplifica**: recibe N microciclos ya calculados.      |

---

## IA.1 — Métricas de calidad del draft

**El problema.** `AiGenerationMetrics` mide si el trabajo terminó y cuánto tardó.
No mide si lo que produjo servía. La señal existe y está sin explotar: un draft
que se acepta a la primera es bueno; uno que necesita tres refinamientos, o que
se descarta, no.

**Qué añadir** al puerto `AiGenerationMetrics` (y a `observability/metrics.ts`):

```ts
/** Un draft alcanzó estado terminal. `outcome` ∈ accepted | discarded. */
abstract recordDraftSettled(kind: string, outcome: string, model: string): void

/** Cuántos refinamientos hubo antes de aceptar. Histograma, buckets 0..5. */
abstract recordRefinementsBeforeAccept(kind: string, model: string, count: number): void
```

- `powerlog_ai_draft_outcome_total{kind,outcome,model}` — contador.
- `powerlog_ai_refinements_before_accept{kind,model}` — histograma.

**Dónde engancharlo.** En los handlers que ya llevan el draft a estado terminal:
`accept-mesocycle-draft.handler.ts`, `accept-plan-draft.handler.ts`,
`discard-*-draft.handler.ts`. El número de refinamientos sale de contar los
mensajes de rol `user` del hilo (`AiPlanMessageEntity`), no hace falta columna
nueva.

> **Cardinalidad.** `model` es una etiqueta de cardinalidad no acotada en BYOK
> (el usuario puede escribir cualquier id que su key alcance). Normalizar contra
> una allowlist — la misma tabla de `static-model-pricing.ts` — y agrupar todo lo
> desconocido bajo `other`. El resto de métricas del repo ya sigue esa regla de
> etiquetas de baja cardinalidad (`observability/metrics.ts:115`).

**Golden set.** Además de la telemetría en producción, un conjunto de ~30
contextos guardados como fixtures, para poder comparar prompts sin esperar a que
lleguen usuarios:

```
apps/api/src/modules/ai/__fixtures__/golden/
  meso-beginner-no-history-3days-strength.json
  meso-intermediate-5days-hypertrophy.json
  meso-imbalanced-e1rm.json          # press fuerte, sentadilla floja
  meso-dumbbells-only.json
  meso-coach-designing-for-athlete.json
  plan-stalling-bench.json           # 3 sesiones al mismo peso
  plan-fatigue-notes.json            # "dormí fatal", "sentí pesado"
  plan-first-session-no-history.json
  ...
```

Un script (`pnpm ai:eval`, fuera del pipeline de CI porque gasta la key de quien
lo lance) que corre cada fixture contra un modelo y pasa la respuesta por el
validador de IA.2, reportando tasa de violaciones por regla. **No mide si el
programa es bueno; mide si es defendible**, que es todo lo que se puede
automatizar sin un entrenador revisando.

**Checkpoint.** Métricas visibles en `/metrics`, un draft aceptado y uno
descartado a mano en local, y el script de eval corriendo contra ≥3 fixtures.

---

## IA.2 — Validación semántica en los parsers

**El problema.** `parseMesocycleResponse` y `parsePlanResponse` validan estructura
(Zod: cotas de sets, reps, RPE, slug existente, días exactos). No validan nada de
entrenamiento. Un mesociclo con seis días de pecho y ninguno de espalda, o con 40
series semanales de cuádriceps, pasa el parser sin una queja.

**Qué añadir.** Un módulo nuevo `application/services/programming-rules.ts` con
reglas deterministas, evaluado **después** del parseo estructural y **antes** de
devolver `ParsedMesocycle` / `ParsedPlan`:

| Regla                            | Comprobación                                                                                        | Severidad |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- | --------- |
| Volumen semanal por músculo      | Series por `primaryMuscle` en la semana dentro de `[MIN, MAX]` según objetivo (fuerza / hipertrofia) | Rechazo   |
| Balance empuje/tracción          | Ratio de series `chest+shoulders+triceps` vs `back+lats+biceps` dentro de `[0.6, 1.6]`               | Rechazo   |
| Compuesto pesado primero         | El primer ejercicio del día no es `category ∈ {arms, core}` si el día tiene algún compuesto          | Rechazo   |
| Duración estimada de la sesión   | `Σ sets × (tiempo de serie + descanso por categoría)` bajo un techo configurable                     | Rechazo   |
| Frecuencia por músculo           | Ningún grupo entrenado en días consecutivos con volumen alto en ambos                                 | Aviso     |
| Solapamiento de patrón           | No dos variantes del mismo patrón el mismo día sin justificación                                      | Aviso     |

Los **rechazos** lanzan `ModelAnswerRejection` con el motivo textual: el mecanismo
que ya existe se lo devuelve al modelo vía `buildRetryPrompt` y este corrige.
Los **avisos** se registran como métrica (`powerlog_ai_rule_warning_total{rule}`)
pero no bloquean — sirven para descubrir qué reglas convendría endurecer.

**Los rangos son configuración, no constantes sueltas.** Van en un objeto
exportado junto a `MESOCYCLE_DRAFT_LIMITS`, para que **el prompt y el validador
lean el mismo sitio**. Hoy `mesocycle-prompt.service.ts:43` interpola
`exercisesPerDay` / `setsPerExercise` desde `MESOCYCLE_DRAFT_LIMITS` — exactamente
el patrón a seguir: si el validador exige 10-20 series semanales de pecho, el
prompt debe decirlo con el mismo número.

> **Ojo con el bucle de reintento.** `AiConversation.ask` reintenta **una vez**.
> Si el validador es demasiado estricto, cada generación cuesta dos llamadas y
> acaba fallando con `InvalidAiMesocycleResponseError`. Empezar con rangos anchos
> y apretarlos con los datos de `rule_warning` de IA.1, no al revés.

**Tests.** `programming-rules.spec.ts` con casos sintéticos por regla (el repo ya
tiene `mesocycle-response.parser.spec.ts` / `plan-response.parser.spec.ts` como
modelo). Estos tests son baratos, deterministas y no tocan proveedor.

**Checkpoint.** Reglas implementadas y testeadas, prompt actualizado con los
mismos números, y el golden set de IA.1 reportando violaciones por regla.

---

## IA.3 — Prompt caching del catálogo

**El problema.** El catálogo de 274 ejercicios es **idéntico para todos los
usuarios y para todas las llamadas**, y se reenvía entero cada vez: en cada
generación de mesociclo y en cada refinamiento del hilo. Hoy no se cachea porque
`buildMesocycleUserPrompt` (`mesocycle-prompt.service.ts:105`) lo concatena en un
único string junto a lo volátil:

```
Block parameters (volátil)
Exercise catalog (estable, ~6-8k tokens)
Athlete strength (volátil, por usuario)
<athlete_request> (volátil)
```

El caché es un **match de prefijo**: cualquier byte distinto antes del punto de
corte invalida todo lo que viene detrás. Con los parámetros del bloque delante del
catálogo, no hay prefijo estable que cachear.

**La reordenación.** El orden de render es `tools` → `system` → `messages`. Mover
el catálogo al `system` y poner ahí el punto de corte:

```ts
system: [
    { type: 'text', text: MESOCYCLE_SYSTEM_PROMPT },              // estable
    { type: 'text', text: serialiseCatalog(catalog),
      cache_control: { type: 'ephemeral' } },                      // estable ← corte
],
messages: [
    { role: 'user', content: buildMesocycleUserPrompt(...) },      // volátil
]
```

El `LlmCompletionRequest` actual tipa `system?: string` — hay que ampliarlo a
bloques con `cache_control` opcional, y que cada adaptador lo traduzca (Anthropic
lo soporta nativo; en OpenAI el caché es automático por prefijo y el campo se
ignora, lo cual es correcto: la reordenación le beneficia igual).

**Economía.** Lectura de caché ~0.1× el precio de entrada, escritura 1.25× (TTL 5
min) o 2× (TTL 1 h). Con TTL de 5 minutos se amortiza a la **segunda** llamada, y
un refinamiento siempre es la segunda. Para el mesociclo, donde el hilo admite
hasta 20 turnos, el ahorro es grande.

**Mínimo cacheable, por modelo.** Un prefijo por debajo del mínimo **no cachea y
no avisa** — devuelve `cache_creation_input_tokens: 0` en silencio:

| Modelo                                 | Mínimo    |
| -------------------------------------- | --------- |
| Claude Opus 5, Fable 5                 | 512 tok   |
| Opus 4.8, Sonnet 5, Sonnet 4.6         | 1024 tok  |
| Opus 4.7                               | 2048 tok  |
| Opus 4.6, Opus 4.5, Haiku 4.5          | 4096 tok  |

El catálogo los supera todos con holgura. **El prompt de sesión no**: no lleva
catálogo, y su contenido es casi todo historial por usuario. **No cachear el
prompt de sesión** — pagaría el 1.25× de escritura sin lecturas después.

**Consecuencia que hay que atender: la contabilidad de uso se rompe.**
`LlmUsage` solo tiene `inputTokens` / `outputTokens`. Con caché activo, los
tokens leídos de caché **no** aparecen en `input_tokens` (que pasa a ser solo el
resto no cacheado), así que `AiUsageRecordedEvent` → `record-ai-usage.handler` →
la vista de uso del usuario **le cobraría de menos, y de forma inconsistente**.
Hay que:

1. Ampliar `LlmUsage` con `cacheCreationInputTokens` y `cacheReadInputTokens`.
2. Ampliar `AiUsageRecordedEvent` y el esquema `ai_usage` con esas dos columnas.
3. Ampliar `ModelPrice` con `cacheWriteUsdPerMTok` / `cacheReadUsdPerMTok` en
   `static-model-pricing.ts` (regla: read = 0.1× input, write 5 min = 1.25× input).

Sin esos tres pasos, IA.3 mete un bug de facturación silencioso.

**Verificación.** Log en `debug` de `cache_read_input_tokens` tras cada llamada.
Si sale 0 en refinamientos repetidos, algo volátil se coló en el prefijo — el
sospechoso habitual es serialización no determinista o una fecha interpolada.

> **El caché es por modelo.** Un refinamiento que corriera sobre un modelo
> distinto al que generó pierde el caché entero. `refine-*-draft.handler` debe
> usar el modelo guardado en el draft (`AiMesocycleDraftProps.model`), no
> re-resolver la config del usuario, que puede haber cambiado entretanto. **Ojo:
> hoy re-resuelve.**

**Checkpoint.** `cache_read_input_tokens > 0` en un refinamiento real, uso
contabilizado correctamente en la vista del usuario, y coste por generación
medido antes/después.

---

## IA.4 — Structured outputs

**El problema.** El contrato de salida se pide en prosa ("Answer with a single
JSON object and nothing else. No prose, no markdown, no code fences") y se valida
después. Cuando el modelo falla el formato, `AiConversation.ask` reintenta — y ese
reintento **reenvía toda la conversación**, así que un fallo de formato cuesta una
llamada completa a precio de entrada, con el catálogo dentro.

**La solución.** Los proveedores garantizan el esquema en origen:

- **Anthropic**: `output_config: { format: { type: 'json_schema', schema } }` en
  `messages.create`, o tool use con `strict: true`.
- **OpenAI**: su equivalente de structured outputs (verificar la forma exacta
  contra su SDK al implementar; no copiarla de memoria).

**Cambios de puerto.** `LlmCompletionRequest` gana un campo opcional:

```ts
/** Esquema JSON que la respuesta debe cumplir. Ignorado si el modelo no lo soporta. */
outputSchema?: { name: string; schema: Record<string, unknown> }
```

Los esquemas Zod **ya existen** en los parsers (`weekSchema`, y el equivalente en
`plan-response.parser.ts`). Con `zod-to-json-schema` se derivan sin duplicar la
verdad: un solo sitio define la forma, el proveedor la impone y el parser la
verifica igualmente al recibirla. **No quitar el parser** — sigue siendo la
frontera de confianza, y las reglas de IA.2 viven ahí.

**Limitaciones del esquema JSON que afectan aquí.** No se soportan restricciones
numéricas (`minimum`, `maximum`, `multipleOf`) ni de longitud (`minLength`,
`maxLength`), y todo objeto necesita `additionalProperties: false` + `required`.
Es decir: `weightKg` positivo ≤ 1000, `rpe` entre 1 y 10, `rationale` ≤ 600
caracteres **siguen siendo trabajo del parser**. Lo que garantiza el esquema es la
forma (campos, tipos, anidamiento) — que es justo donde fallan los modelos.

**Degradación.** Es BYOK: el usuario elige el modelo y puede elegir uno que no lo
soporte. Enviar `outputSchema` a un modelo sin soporte devuelve 400. Dos opciones:

1. Consultar capacidades vía Models API y guardarlas (ver IA.8) — preferible.
2. Intentar con esquema y, ante 400 de parámetro no soportado, reintentar sin él.

La (1) es más limpia y IA.8 la necesita de todas formas; la (2) sirve como red.

> **La primera llamada con un esquema nuevo tiene latencia extra** (compilación
> del esquema; luego se cachea 24 h). Irrelevante aquí porque las generaciones ya
> son asíncronas por cola (`ai_generations` existe justamente porque el proveedor
> tarda 20-30 s), pero conviene saberlo antes de investigar un p99 raro.

**Checkpoint.** Generación de mesociclo y de sesión con esquema activo, un modelo
sin soporte degradando sin error visible, y la tasa de reintentos por formato
(métrica nueva o el `logger.warn` existente) cayendo a ~0.

---

## IA.5 — Cargas calculadas en backend, no por el modelo

**El problema.** `mesocycle-prompt.service.ts:36` le pide al modelo:

> *"prescribe real kilograms as a percentage of it, rounded to the nearest 2.5 kg"*

Y `plan-prompt.service.ts:23-25` le pide progresar "~2.5% o una repetición". Eso
es aritmética de tres pasos (leer e1RM → aplicar % → redondear al incremento) que
el LLM hace de forma no determinista y sin poder auditar. Es también la única
parte del trabajo que un `for` hace perfectamente.

**El reparto correcto:**

| Decide el modelo                                   | Calcula el backend                                     |
| -------------------------------------------------- | ------------------------------------------------------ |
| Qué ejercicios y en qué orden                      | `weightKg` desde e1RM + reps objetivo + RIR/RPE        |
| Cuántas series                                     | Redondeo al incremento real del equipamiento           |
| Rango de repeticiones                              | Progresión semana a semana (junto con IA.7)            |
| Intensidad objetivo (RIR/RPE)                      | Recortes por seguridad (nunca > 100% e1RM, etc.)       |
| Notas y `rationale`                                |                                                        |

**Cómo.** Módulo nuevo `domain/load-calculator.ts`:

```ts
/** Kilos para un objetivo de reps@RIR sobre un e1RM conocido. Null si no hay e1RM. */
export function prescribeLoad(input: {
    e1rmKg: number | null
    reps: number
    rir: number | null
    rpe: number | null
    equipment: ExerciseEquipment
}): number | null
```

- Tabla RPE→%1RM por repeticiones (la clásica de RTS) como constante del dominio.
  Fallback a Epley invertido cuando solo hay RIR.
- Incremento por equipamiento: `barbell` 2.5 kg, `dumbbell` 1.25 kg (por
  mancuerna → 2.5 kg de salto real), `machine` / `cable` 2.5 kg, `bodyweight`
  devuelve `null`. Cinco valores, uno por cada entrada de `EXERCISE_EQUIPMENT`.
- Sin e1RM → `null`, exactamente el comportamiento que hoy se le pide al modelo
  por prosa ("Never guess a weight for a lift the athlete has no history on").

**Cambios en el prompt.** Se cae la sección "Loads" entera del system prompt del
mesociclo, y con ella el bloque `serialiseStrength` deja de ser un dato de cálculo
para ser un dato de contexto (el modelo sigue queriendo saber qué levanta el
atleta para elegir ejercicios y volumen, pero no para multiplicar). El esquema de
respuesta pierde `weightKg`: el modelo devuelve `reps` + `rpe`/`rir` y el backend
completa. **Esto simplifica también el esquema de IA.4.**

> **`assertIntensityIsUnambiguous`** (`domain/plan-intensity.ts`) ya garantiza que
> nunca vengan `rpe` y `rir` a la vez. El calculador puede confiar en eso.

**Ganancia lateral.** Un cambio de e1RM (el atleta mejora) puede recalcular las
cargas de un draft abierto sin volver a llamar al proveedor. Y las cargas pasan a
ser testeables con tests de tabla, sin red.

**Checkpoint.** `load-calculator.spec.ts` con casos por equipamiento y por
intensidad, prompts limpios de aritmética, y un mesociclo generado end-to-end con
cargas coherentes.

---

## IA.6 — Contexto: fatiga, tendencia, perfil, equipamiento

**El problema.** El prompt de sesión recibe 6 sesiones crudas por ejercicio
(`HISTORY_LIMIT` en `planning/query-bus-session-plan-context-reader.ts:8`) y le
pide al modelo que deduzca de ahí la tendencia. Es caro en tokens y el modelo lo
hace peor que una consulta SQL. Faltan además los datos que un entrenador miraría
antes que ningún otro.

### Lo que hay que añadir al `SessionPlanContext`

```ts
export interface ExercisePlanContext {
    // ... lo actual
    /** Días desde la última vez que se entrenó ESTE ejercicio. Null si nunca. */
    daysSinceLastPerformed: number | null
    /** Tendencia del e1RM en 8 semanas: pendiente en kg/semana. Null si <3 puntos. */
    e1rmTrendKgPerWeek: number | null
    /** Mejor e1RM registrado y cuándo, para saber si está por debajo de su marca. */
    bestE1rmKg: number | null
    /** Series planificadas vs completadas al peso objetivo, última sesión. */
    lastSessionAdherence: { planned: number; completed: number } | null
}

export interface SessionPlanContext {
    // ... lo actual
    /** Series por grupo muscular en los últimos 7 días. Fatiga acumulada. */
    weeklyVolumeByMuscle: Record<string, number>
    /** Días desde la última sesión completada, cualquiera. */
    daysSinceLastSession: number | null
    /** Posición en el bloque, si la sesión pertenece a un mesociclo. */
    mesocyclePosition: { week: number; totalWeeks: number; isDeload: boolean } | null
}
```

**Y bajar `HISTORY_LIMIT` de 6 a 3.** Con los agregados calculados arriba, tres
sesiones en detalle bastan: el modelo necesita ver la textura reciente (notas,
cómo fueron las series), no re-derivar una regresión. **Menos tokens y más señal.**

Los agregados salen de SQL en `ExerciseSessionHistoryReadModel` y un read-model
nuevo para el volumen por músculo, ambos dentro de `workouts` — el módulo de IA
sigue sin tocar el esquema, como manda `mesocycle-design-context.ts:1`.

### Lo que hay que añadir al `MesocycleDesignContext`

```ts
export interface MesocycleDesignContext {
    catalog: CatalogExercise[]          // sin cambios — se cachea entero (IA.3)
    strength: AthleteStrength[]
    /** Perfil del atleta. Todo opcional: un perfil vacío no debe romper nada. */
    athlete: {
        ageYears: number | null
        sex: 'male' | 'female' | null
        heightCm: number | null
        bodyweightKg: number | null           // requiere decisión abierta
        experience: 'beginner' | 'intermediate' | 'advanced' | null
        /** Subconjunto de EXERCISE_EQUIPMENT al que tiene acceso. Vacío = todo. */
        availableEquipment: string[]
        /** Texto libre. DATO, nunca instrucción — mismo tratamiento que athlete_request. */
        limitations: string | null
    }
    /** Resumen del bloque anterior: qué se hizo y si se aceptó. */
    previousBlock: { name: string; weeks: number; volumeByMuscle: Record<string, number> } | null
}
```

**Sobre el equipamiento y el caché: no filtrar el catálogo.** Filtrarlo por
usuario rompería el prefijo compartido de IA.3 y cada atleta pagaría su propia
escritura de caché. Mejor: **catálogo completo cacheado** + una línea en la parte
volátil del prompt ("este atleta solo tiene acceso a: dumbbell, bodyweight") +
**regla dura en el validador de IA.2** que rechaza cualquier slug cuyo
`equipment` no esté disponible. El coste de los ejercicios inalcanzables en el
prompt es casi cero con caché; la garantía la da el validador, no el prompt.

**El perfil es dato del atleta, no del que pide.** `GetMesocycleDesignContextHandler`
ya resuelve `trainee` correctamente cuando un coach diseña para su atleta
(`resolveTrainee`, con `CoachLinks.areLinked`). El perfil debe seguir la misma
regla: el del que va a entrenar. **Es un puerto nuevo hacia `profile`** — mirar
`ProfileSnapshotReader` (`shared/contracts/profile-snapshot-reader.ts`) como
plantilla, pero **no reutilizarlo**: sirve a auth para el JWT y expone campos
públicos (handle, avatar), no antropometría. Un contrato nuevo,
`AthleteProfileReader`, con su `GetAthleteProfileQuery` en el shared kernel.

**Checkpoint.** Contextos ampliados con tests de integración, prompt de sesión más
corto en tokens que el actual pese a llevar más información, y el validador
rechazando equipamiento no disponible.

---

## IA.7 — Progresión multi-semana del mesociclo

**El problema — el más grande del módulo.** De
`ai-mesocycle-draft.entity.ts:96`:

> *"How many weeks the athlete asked for; the template is replicated to fill them"*

Y del system prompt (`mesocycle-prompt.service.ts:31`):

> *"That week is the template for a multi-week block: it will be repeated for
> every week of the block, and the athlete adjusts the progression themselves
> afterwards."*

El modelo diseña una semana, el cliente la clona N veces, y **el atleta ajusta la
progresión a mano**. Eso no es un mesociclo: es un microciclo con copy-paste. No
hay progresión de carga, ni acumulación de volumen, ni descarga, ni pico. Y
"el atleta lo ajusta después" delega manualmente justo lo que debería ser el valor
del producto.

Ningún cambio de prompt ni de modelo arregla esto. Es estructural.

**La solución — no pedirle al modelo que escriba seis semanas.** Escribirlas
enteras es caro (6× tokens de salida), lento, y el modelo pierde consistencia
aritmética entre semanas. En su lugar: **semana plantilla + esquema de progresión
declarativo**, y el backend expande.

```jsonc
{
  "name": "...",
  "rationale": "...",
  "days": [ /* la semana plantilla, igual que hoy */ ],
  "progression": {
    "model": "double_progression" | "linear_percent" | "rpe_ramp",
    "weeklyIntensityStepPct": 2.5,   // % de e1RM que sube por semana
    "weeklySetIncrement": 1,         // series/semana en los principales, 0 = sin acumulación
    "deloadWeeks": [3],              // índices 0-based dentro del bloque
    "deloadFactor": 0.6              // multiplicador de volumen en la descarga
  }
}
```

**La expansión vive en el dominio**, no en el cliente:
`domain/mesocycle-expander.ts` toma `(proposal, progression, weeks)` y devuelve
`weeks` microciclos, apoyándose en el `load-calculator` de IA.5 para los kilos de
cada semana. Determinista, testeable sin proveedor, y auditable: si la semana 4
prescribe algo raro, se ve en un test, no en una llamada a la API.

**Reglas de validación propias** (extienden IA.2):
- `deloadWeeks` dentro de `[0, weeks)` y nunca la primera.
- Bloques de ≥4 semanas exigen al menos una descarga.
- La intensidad acumulada no puede superar el 100% del e1RM en la última semana.
- `weeklySetIncrement × weeks` no puede sacar el volumen semanal del rango de IA.2.

**Migración.** `MesocycleDraftProposal` gana el campo `progression`. Los drafts ya
guardados no lo tienen: `rehydrate` debe tolerar su ausencia y asumir
`{ model: 'linear_percent', weeklyIntensityStepPct: 0, deloadWeeks: [] }` — que es
exactamente el comportamiento actual (semana clonada sin cambios). Sin migración
de datos.

**Cliente.** El builder deja de replicar la semana: recibe N microciclos ya
calculados y los muestra. Es menos código en `mesocycle-builder.tsx`, no más.

**Checkpoint.** Un bloque de 5 semanas con descarga en la 4, expandido en el
backend, con cargas coherentes semana a semana y tests de tabla del expansor.

---

## IA.8 — Modelo y parámetros por tipo de tarea

**El problema.** `ai_provider_configs` guarda **un** `model` por proveedor y las
cuatro tareas (`session_plan`, `mesocycle` y sus refinamientos) lo comparten. No
son la misma dificultad: diseñar un bloque es razonamiento sobre 274 opciones con
restricciones cruzadas; progresar una sesión es aplicar una regla sobre historial.

**Defaults recomendados** (sugeridos en la UI, no impuestos — sigue siendo BYOK):

| Tarea               | Modelo             | `effort`  | Por qué                                                    |
| ------------------- | ------------------ | --------- | ---------------------------------------------------------- |
| Diseño de mesociclo | `claude-opus-5`    | `xhigh`   | Razonamiento con restricciones cruzadas                    |
| Plan de sesión      | `claude-sonnet-5`  | `medium`  | Rutinario; gana más con datos (IA.6) que con razonamiento  |
| Refinamiento        | **El que generó**  | igual     | Cambiar de modelo invalida el caché del hilo (IA.3)        |

**Capacidades, no adivinanzas.** `ListAiModelsHandler` ya llama a `listModels`.
La Models API de Anthropic devuelve, por modelo, `max_input_tokens`, `max_tokens`
y un árbol `capabilities` con `thinking.types.adaptive.supported`,
`effort.<nivel>.supported` e `image_input.supported`. Ampliar `LlmModel`:

```ts
export interface LlmModel {
    id: string
    displayName: string
    /** Qué admite este modelo. Todo false por defecto si el proveedor no informa. */
    capabilities: {
        adaptiveThinking: boolean
        effort: boolean
        structuredOutputs: boolean
    }
    maxInputTokens: number | null
}
```

Con eso: la UI etiqueta modelos ("recomendado para mesociclos", "no soporta
salida estructurada"), IA.4 sabe si mandar el esquema, y esto sabe si mandar
`thinking` / `effort`. Las capacidades se guardan junto a la config al elegir
modelo, no se consultan en cada generación.

**Sobre `thinking`.** `anthropic.provider-client.ts:19-25` documenta por qué hoy
no se envía: `{type:"adaptive"}` da 400 en modelos anteriores a 4.6, y el usuario
elige cualquier modelo que su key alcance. **Esa decisión era correcta y sigue
siéndolo mientras no haya capacidades guardadas.** Con ellas, activar
`thinking: {type: 'adaptive'}` + `output_config: {effort}` solo donde se soporte.
Tres avisos al implementarlo:

1. **En Opus 5 el thinking está activo por defecto** al omitir el parámetro (a
   diferencia de 4.8/4.7, donde omitirlo significa no pensar). Es decir: puede
   que ya se esté pagando thinking sin saberlo si alguien usa Opus 5.
2. **`max_tokens` cubre thinking + respuesta.** Los 16000 actuales
   (`ai-conversation.service.ts:19`) dan margen y el comentario que explica por
   qué se subió desde 4096 sigue siendo válido — **no bajarlo**.
3. **`thinking: {type:'disabled'}` con `effort: xhigh` o `max` devuelve 400** en
   Opus 5. Si se añade un interruptor de "sin thinking", tiene que capar el
   effort a `high`.

**Con thinking activo, el prompt puede simplificarse.** Hoy `rationale` (600
chars) hace doble papel: explicación para el atleta y sitio donde el modelo
razona. Con bloques de thinking, el razonamiento va ahí y `rationale` queda solo
para el usuario — que es lo que el cap de 600 caracteres siempre quiso.

**Migración de esquema.** Aditiva: `ai_provider_configs` gana columnas nullables
por tarea (`mesocycle_model`, `session_plan_model`) que, si son null, caen al
`model` actual. Ninguna config existente se rompe.

**Checkpoint.** Capacidades leídas y guardadas, un modelo antiguo funcionando sin
thinking, uno moderno con effort activo, y coste/latencia por tarea medidos.

---

## Testing (convenciones del repo)

- **Dominio y application con unit tests** (Vitest), como ya hacen
  `mesocycle-response.parser.spec.ts`, `set-prescriber.service.spec.ts`,
  `ai-generation.entity.spec.ts`. Todo IA.2, IA.5 y IA.7 cae aquí: son funciones
  puras y deterministas, **cero llamadas a proveedor**.
- **Integración con Testcontainers** para los contextos ampliados de IA.6 (los
  agregados salen de SQL) — patrón de `__integration__/ai-mesocycle-draft.integration.spec.ts`.
- **Ningún test toca la API real.** El golden set de IA.1 es un script manual
  (`pnpm ai:eval`), no parte de `pnpm test`: gasta la key de quien lo lanza y su
  resultado no es determinista.
- **`LlmProviderClient` se mockea** en los tests de application, como ya se hace.
  Los cambios de puerto de IA.3/IA.4/IA.8 obligan a actualizar esos dobles.

## Fuera de alcance (decidir más adelante)

- **Peso corporal y medidas** — tabla `body_measurements` como serie temporal, con
  su UI de registro y su gráfica. Es un bloque de producto propio; IA.6 lo consume
  si existe y funciona sin él si no.
- **Detección automática de nivel de experiencia** desde el historial. Preguntarlo
  es más fiable y mucho más barato.
- **Generar las N semanas con el modelo** en vez de expandirlas (IA.7). Si algún
  día se quiere periodización no expresable con un esquema declarativo (bloques
  conjugados, ondulación diaria compleja), es rediseñar IA.7, no ampliarlo.
- **Fine-tuning o modelo propio.** No antes de tener el golden set de IA.1 con
  varios cientos de drafts aceptados/descartados etiquetados. Hasta entonces no
  hay dataset ni forma de medir si mejoraría.
- **RAG sobre literatura de entrenamiento.** Suena bien y casi nunca supera a
  meter las reglas en el system prompt, que además es cacheable y auditable.
  Reconsiderar solo si el validador de IA.2 se vuelve inmanejable.
- **Feedback explícito del atleta sobre el draft** (pulgar arriba/abajo, "esto no
  me sirve porque..."). Sería la mejor señal de calidad de todas, mejor que las
  proxies de IA.1, pero es UI y producto, no IA.
- **Streaming de la generación.** `llm-provider.port.ts:44` ya lo anota como
  ausente a propósito ("the streaming transport is an open decision"). Con las
  generaciones en cola y un SSE que ya avisa al terminar, no aporta lo suficiente
  para justificar el transporte.
- **Ajuste automático del mesociclo en curso** según adherencia real (el atleta
  falla la semana 2 → recalcular las semanas 3-5). Con IA.5 e IA.7 es
  técnicamente barato — el expansor ya es determinista — pero es una decisión de
  producto: cambiarle el plan a alguien sin pedírselo tiene su propio debate.
