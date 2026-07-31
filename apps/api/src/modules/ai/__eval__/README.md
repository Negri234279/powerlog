# Golden-set eval (IA.1 / IA.2)

A manual harness that measures whether the model's mesocycle answers are
**defensible** — i.e. survive the same validation the designer applies (structure,
IA.2 programming rules, IA.7 progression) — not whether the programme is _good_.
That is all that can be automated without a coach reviewing each block.

## Running it

Deliberately **outside** the test suite and CI: it calls a real provider, spends
your own API key, and its output is non-deterministic. Run it from `apps/api`
with the provider key in the environment:

```bash
ANTHROPIC_API_KEY=sk-... pnpm --filter @powerlog/api ai:eval
# or, for OpenAI fixtures
OPENAI_API_KEY=sk-...      pnpm --filter @powerlog/api ai:eval
```

Each fixture is sent to its `provider`/`model`, and the answer is scored:

```
✓ meso-beginner-no-history-3days-strength (warnings: weekly_volume_low)
✗ meso-imbalanced-e1rm: weekly push volume (18 sets ...) badly out of balance ...

2/3 defensible

Rejections by reason:
  1×  weekly push volume ... badly out of balance ...
Warnings by rule:
  2×  weekly_volume_low
```

## Adding fixtures

Drop a `meso-*.json` in `__fixtures__/golden/` with `{ name, provider, model,
request, strength }`. `request` is `{ weeks, trainingDays, goal, prompt }`;
`strength` is a list of `{ slug, e1rmKg, lastTrainedAt }`. The exercise catalog is
shared across fixtures in `_catalog.json`.

## What is tested in CI

The deterministic half — the validator (`collect-violations.ts`) — is covered by
`collect-violations.spec.ts`, which **does** run in CI. Only the provider call is
manual.
