import { sql } from 'drizzle-orm'
import {
    type AnyPgColumn,
    doublePrecision,
    index,
    integer,
    pgEnum,
    pgTable,
    primaryKey,
    text,
    timestamp,
    uniqueIndex,
    uuid,
} from 'drizzle-orm/pg-core'

import { PLAN_DRAFT_STATUSES } from '../../../domain/value-objects/plan-draft-status.vo'
import { aiProviderEnum } from './ai-provider-configs.schema'

export const aiPlanDraftStatusEnum = pgEnum('ai_plan_draft_status', PLAN_DRAFT_STATUSES)
export const aiPlanMessageRoleEnum = pgEnum('ai_plan_message_role', ['user', 'assistant'])

/**
 * `ai_plan_drafts` — a proposal for one planned session, awaiting the athlete's
 * decision. `user_id` and `session_id` are SOFT references (no DB foreign key):
 * a real FK would force this file to import another module's schema, crossing a
 * module boundary. Drafts are erased on account deletion via an integration event.
 */
export const aiPlanDrafts = pgTable(
    'ai_plan_drafts',
    {
        id: uuid('id').primaryKey(),
        userId: uuid('user_id').notNull(),
        sessionId: uuid('session_id').notNull(),
        // The single exercise entry programmed; null = the whole session.
        entryId: uuid('entry_id'),
        provider: aiProviderEnum('provider').notNull(),
        // The model that produced it — the same session re-proposed by another
        // model is a different draft, and the history should say which was which.
        model: text('model').notNull(),
        status: aiPlanDraftStatusEnum('status').notNull().default('open'),
        // The draft this one continues, when the athlete picked an old conversation
        // back up. Self-reference, nulled rather than cascaded: losing the ancestor
        // must never take the fork with it.
        parentDraftId: uuid('parent_draft_id').references((): AnyPgColumn => aiPlanDrafts.id, {
            onDelete: 'set null',
        }),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        // A session has at most one proposal on the table at a time. Accepted and
        // discarded drafts fall out of the index, so the history stays.
        uniqueIndex('ai_plan_drafts_one_open_per_session')
            .on(table.sessionId)
            .where(sql`${table.status} = 'open'`),
        // The history feed: one user's drafts, newest activity first. Replaces a
        // plain `user_id` index — this one has it as a prefix, so it also serves
        // the erase-on-account-deletion scan.
        index('ai_plan_drafts_user_updated_idx').on(table.userId, table.updatedAt.desc(), table.id.desc()),
    ],
)

/**
 * `ai_plan_draft_sets` — one prescribed working set, addressed positionally
 * within its exercise entry. The model owns the set count, so a draft may hold
 * more positions than the session currently has sets; workouts creates the
 * missing ones on accept.
 */
export const aiPlanDraftSets = pgTable(
    'ai_plan_draft_sets',
    {
        draftId: uuid('draft_id')
            .notNull()
            .references(() => aiPlanDrafts.id, { onDelete: 'cascade' }),
        entryId: uuid('entry_id').notNull(),
        // 1-based position within the entry.
        order: integer('order').notNull(),
        plannedWeightKg: doublePrecision('planned_weight_kg'),
        plannedReps: integer('planned_reps'),
        rpe: doublePrecision('rpe'),
        rir: integer('rir'),
        notes: text('notes'),
    },
    (table) => [primaryKey({ columns: [table.draftId, table.entryId, table.order] })],
)

/**
 * `ai_plan_draft_messages` — the refinement conversation attached to a draft.
 *
 * `position` orders the thread, not `created_at`: the athlete's request and the
 * model's answer to it are recorded at the same instant, and Postgres returns ties
 * in whatever order it likes — which would show the conversation backwards. Same
 * call as `ai_mesocycle_draft_messages`.
 */
export const aiPlanDraftMessages = pgTable(
    'ai_plan_draft_messages',
    {
        id: uuid('id').primaryKey(),
        draftId: uuid('draft_id')
            .notNull()
            .references(() => aiPlanDrafts.id, { onDelete: 'cascade' }),
        /** 0-based position in the thread. */
        position: integer('position').notNull(),
        role: aiPlanMessageRoleEnum('role').notNull(),
        content: text('content').notNull(),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [uniqueIndex('ai_plan_draft_messages_draft_position').on(table.draftId, table.position)],
)
