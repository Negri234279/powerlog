# powerlog

Training tracker for bodybuilding/powerlifting — log sessions, exercises, sets,
loads, RPE/RIR, and view progress stats (volume, tonnage, e1RM, frequency per
muscle group). Web responsive. No native mobile, no PWA (for now).

## Stack

- **Monorepo**: pnpm workspaces + Turborepo
- **API** (`apps/api`): NestJS + GraphQL code-first + CQRS, Drizzle + PostgreSQL 16
- **Web** (`apps/web`): Next.js 15 (App Router) + React Query + graphql-request
- **Auth**: JWT RS256 in an HTTPOnly cookie
- **Tooling**: ESLint (+ boundaries) · Prettier · Vitest · Docker Compose

## Requirements

- Node **22** (`.nvmrc`)
- pnpm **9** (`corepack enable`)
- Docker (for Postgres / integration tests via Testcontainers)

## Getting started

```bash
corepack enable
pnpm install
cp .env.example .env       # fill in values
pnpm dev                   # runs api + web via turbo
```

## Common commands

| Command            | What it does                      |
| ------------------ | --------------------------------- |
| `pnpm dev`         | Run all apps in dev mode          |
| `pnpm build`       | Build all packages                |
| `pnpm lint`        | Lint (incl. layer-boundary rules) |
| `pnpm test`        | Run Vitest across apps            |
| `pnpm codegen`     | GraphQL codegen for the web app   |
| `pnpm db:generate` | Generate Drizzle migrations       |
| `pnpm db:migrate`  | Apply migrations                  |

See [`CLAUDE.md`](./CLAUDE.md) for architecture, layer rules, anti-patterns, and
how to add a new module.
