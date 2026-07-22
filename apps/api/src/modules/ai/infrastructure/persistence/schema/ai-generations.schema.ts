import { sql } from 'drizzle-orm'
import { index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import type { AiGenerationRequest } from '../../../domain/entities/ai-generation.entity'
import { GENERATION_KINDS } from '../../../domain/value-objects/generation-kind.vo'
import { GENERATION_STATUSES } from '../../../domain/value-objects/generation-status.vo'

export const aiGenerationKindEnum = pgEnum('ai_generation_kind', GENERATION_KINDS)
export const aiGenerationStatusEnum = pgEnum('ai_generation_status', GENERATION_STATUSES)

/**
 * `ai_generations` — one LLM job in flight. It exists because the provider takes
 * ~20–30s to answer in production, so the work cannot live inside an HTTP
 * request: the mutation writes a row here and returns, a worker settles it.
 *
 * `user_id` and the ids inside `request` are SOFT references (no DB foreign key):
 * a real FK would force this file to import another module's schema, crossing a
 * module boundary. Generations are erased on account deletion via an integration
 * event, like the drafts.
 *
 * `request` is jsonb because its shape follows `kind` — four shapes across one
 * table, none of them ever queried by field. `AiGenerationAggregate.rehydrate`
 * re-asserts what Postgres cannot check here.
 *
 * `draft_id` carries no FK either, deliberately: it points at whichever of the two
 * draft tables `kind` names, and the generation must survive the draft being
 * deleted — the history of what was asked for is worth keeping on its own.
 */
export const aiGenerations = pgTable(
    'ai_generations',
    {
        id: uuid('id').primaryKey(),
        // Who asked. A coach designing for an athlete still owns the job.
        userId: uuid('user_id').notNull(),
        kind: aiGenerationKindEnum('kind').notNull(),
        status: aiGenerationStatusEnum('status').notNull().default('queued'),
        // What was asked for, so a job whose worker died is still legible and
        // re-drivable rather than being knowable only from a lost Redis payload.
        request: jsonb('request').$type<AiGenerationRequest>().notNull(),
        // What it produced, once it succeeded.
        draftId: uuid('draft_id'),
        // The stable `code` of the domain error that stopped it. A code, never the
        // provider's words: it is shown to the athlete and used as a metric label.
        failureCode: text('failure_code'),
        // What the job occupies while it runs (`session:<id>`, `draft:<id>`,
        // `mesocycle:<id>`), derived by the aggregate. Stored so the index below
        // can be a real constraint rather than a check-then-write race.
        scopeKey: text('scope_key').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        // One unfinished job per scope. This is the constraint that stops a double
        // click — or a client retrying a mutation it believed had failed — from
        // spending the athlete's provider credit twice on the same answer. Settled
        // rows fall out of the index, so the history stays.
        uniqueIndex('ai_generations_one_in_flight_per_scope')
            .on(table.scopeKey)
            .where(sql`${table.status} in ('queued', 'running')`),
        // The user's jobs, newest first: their own history feed, and the prefix
        // that serves the erase-on-account-deletion scan.
        index('ai_generations_user_created_idx').on(table.userId, table.createdAt.desc(), table.id.desc()),
    ],
)
