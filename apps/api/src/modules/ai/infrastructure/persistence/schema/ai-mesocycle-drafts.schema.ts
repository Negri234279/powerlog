import { sql } from 'drizzle-orm'
import { integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import type { MesocycleDraftProposal } from '../../../domain/entities/ai-mesocycle-draft.entity'
import { aiPlanDraftStatusEnum, aiPlanMessageRoleEnum } from './ai-plan-drafts.schema'
import { aiProviderEnum } from './ai-provider-configs.schema'

/**
 * `ai_mesocycle_drafts` — a proposed training block awaiting the athlete's
 * decision. `user_id` is a SOFT reference (no DB foreign key): a real FK would
 * force this file to import another module's schema, crossing a module boundary.
 * Drafts are erased on account deletion via an integration event.
 *
 * The proposed week lives in `content` as jsonb rather than in day/exercise/set
 * tables. It is a tree that is always read and replaced whole, never queried by
 * field — and the `exercise_id`s inside it belong to the workouts module, so
 * three relational tables could not carry a foreign key to them either. What
 * they would buy is three mappers. `AiMesocycleDraftAggregate.rehydrate`
 * re-asserts the invariants Postgres cannot check here.
 *
 * `training_days` records the 0–6 offsets the athlete asked for, so a refinement
 * can hold the model to the same week shape it was first given.
 */
export const aiMesocycleDrafts = pgTable(
    'ai_mesocycle_drafts',
    {
        id: uuid('id').primaryKey(),
        userId: uuid('user_id').notNull(),
        provider: aiProviderEnum('provider').notNull(),
        // The model that produced it — the same block re-proposed by another model
        // is a different draft, and the history should say which was which.
        model: text('model').notNull(),
        status: aiPlanDraftStatusEnum('status').notNull().default('open'),
        weeks: integer('weeks').notNull(),
        trainingDays: integer('training_days').array().notNull(),
        goal: text('goal'),
        // The proposed name and week. `goal`, `weeks` and `training_days` stay
        // columns because they are the athlete's request, not the model's answer.
        content: jsonb('content').$type<MesocycleDraftProposal>().notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        // An athlete has at most one proposal on the table at a time. Accepted and
        // discarded drafts fall out of the index, so the history stays.
        uniqueIndex('ai_mesocycle_drafts_one_open_per_user')
            .on(table.userId)
            .where(sql`${table.status} = 'open'`),
    ],
)

/**
 * `ai_mesocycle_draft_messages` — the refinement conversation attached to a draft.
 *
 * `position` orders the thread, not `created_at`: the athlete's request and the
 * model's answer to it are recorded at the same instant, and Postgres returns ties
 * in whatever order it likes — which would show the conversation backwards.
 */
export const aiMesocycleDraftMessages = pgTable(
    'ai_mesocycle_draft_messages',
    {
        id: uuid('id').primaryKey(),
        draftId: uuid('draft_id')
            .notNull()
            .references(() => aiMesocycleDrafts.id, { onDelete: 'cascade' }),
        /** 0-based position in the thread. */
        position: integer('position').notNull(),
        role: aiPlanMessageRoleEnum('role').notNull(),
        content: text('content').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [uniqueIndex('ai_mesocycle_draft_messages_draft_position').on(table.draftId, table.position)],
)
