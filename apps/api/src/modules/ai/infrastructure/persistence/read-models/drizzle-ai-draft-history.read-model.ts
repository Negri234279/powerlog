import { Inject, Injectable } from '@nestjs/common'
import { and, eq, isNull, type SQL, sql } from 'drizzle-orm'
import { type PgColumn, unionAll } from 'drizzle-orm/pg-core'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type AiDraftHistoryCursor,
    type AiDraftHistoryFilter,
    type AiDraftKind,
    type AiDraftHistorySlice,
    type AiDraftSummaryRow,
    AiDraftHistoryReadModel,
} from '../../../application/ports/ai-draft-history.read-model'
import { aiMesocycleDrafts } from '../schema/ai-mesocycle-drafts.schema'
import { aiPlanDrafts } from '../schema/ai-plan-drafts.schema'

/** The row shape both branches of the union must produce, in this exact order. */
type Row = Omit<AiDraftSummaryRow, 'messageCount'> & { messageCount: number | string }

@Injectable()
export class DrizzleAiDraftHistoryReadModel extends AiDraftHistoryReadModel {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async list(filter: AiDraftHistoryFilter): Promise<AiDraftHistorySlice> {
        // A session filter cannot match a mesocycle draft, and an athlete filter
        // cannot match a session one — so each narrows the feed to a single table
        // rather than adding an always-false branch to the union.
        const wantsSessions = filter.kind !== 'mesocycle' && filter.athleteId === undefined
        const wantsMesocycles = filter.kind !== 'session' && filter.sessionId === undefined

        // Contradictory filters (a session *and* an athlete) can match nothing.
        if (!wantsSessions && !wantsMesocycles) {
            return {
                items: [],
                hasNextPage: false,
            }
        }

        const rows = await this.page(filter, wantsSessions, wantsMesocycles)

        const hasNextPage = rows.length > filter.limit
        const page = hasNextPage ? rows.slice(0, filter.limit) : rows

        return {
            hasNextPage,
            items: page.map((row) => ({
                ...row,
                // count(*) comes back as a bigint string on some drivers.
                messageCount: Number(row.messageCount),
            })),
        }
    }

    private page(filter: AiDraftHistoryFilter, wantsSessions: boolean, wantsMesocycles: boolean): Promise<Row[]> {
        // ORDER BY over a UNION may only name output columns, so it is written as
        // SQL rather than built from either table's columns.
        const ordering = sql`"updated_at" desc, "id" desc`
        const limit = filter.limit + 1

        if (!wantsMesocycles) return this.sessions(filter).orderBy(ordering).limit(limit)
        if (!wantsSessions) return this.mesocycles(filter).orderBy(ordering).limit(limit)

        return unionAll(this.sessions(filter), this.mesocycles(filter)).orderBy(ordering).limit(limit)
    }

    private sessions(filter: AiDraftHistoryFilter) {
        const conditions: SQL[] = [eq(aiPlanDrafts.userId, filter.userId)]
        if (filter.status) conditions.push(eq(aiPlanDrafts.status, filter.status))
        if (filter.sessionId) conditions.push(eq(aiPlanDrafts.sessionId, filter.sessionId))
        if (filter.cursor) conditions.push(keyset(aiPlanDrafts.updatedAt, aiPlanDrafts.id, filter.cursor))

        return this.db
            .select({
                id: aiPlanDrafts.id,
                // Typed as the union, not the literal: `unionAll` requires both
                // branches to have the exact same result type.
                kind: sql<AiDraftKind>`'session'`.as('kind'),
                status: aiPlanDrafts.status,
                provider: aiPlanDrafts.provider,
                model: aiPlanDrafts.model,
                sessionId: sql<string | null>`${aiPlanDrafts.sessionId}`.as('session_id'),
                athleteId: sql<string | null>`null::uuid`.as('athlete_id'),
                name: sql<string | null>`null::text`.as('name'),
                // `${aiPlanDrafts}."id"`, not `${aiPlanDrafts.id}`: with a single
                // table in the FROM, drizzle renders a column reference bare (`"id"`),
                // and inside a correlated subquery that binds to the *messages* table
                // instead of the outer draft — matching nothing, silently.
                title: sql<string | null>`(
                    select m."content" from "ai_plan_draft_messages" m
                    where m."draft_id" = ${aiPlanDrafts}."id" and m."role" = 'user'
                    order by m."position" limit 1
                )`.as('title'),
                messageCount: sql<number>`(
                    select count(*) from "ai_plan_draft_messages" m where m."draft_id" = ${aiPlanDrafts}."id"
                )::int`.as('message_count'),
                createdAt: aiPlanDrafts.createdAt,
                updatedAt: aiPlanDrafts.updatedAt,
            })
            .from(aiPlanDrafts)
            .where(and(...conditions))
    }

    private mesocycles(filter: AiDraftHistoryFilter) {
        const conditions: SQL[] = [eq(aiMesocycleDrafts.userId, filter.userId)]
        if (filter.status) conditions.push(eq(aiMesocycleDrafts.status, filter.status))
        if (filter.athleteId === 'self') conditions.push(isNull(aiMesocycleDrafts.athleteId))
        else if (filter.athleteId) conditions.push(eq(aiMesocycleDrafts.athleteId, filter.athleteId))
        if (filter.cursor) conditions.push(keyset(aiMesocycleDrafts.updatedAt, aiMesocycleDrafts.id, filter.cursor))

        return this.db
            .select({
                id: aiMesocycleDrafts.id,
                kind: sql<AiDraftKind>`'mesocycle'`.as('kind'),
                status: aiMesocycleDrafts.status,
                provider: aiMesocycleDrafts.provider,
                model: aiMesocycleDrafts.model,
                sessionId: sql<string | null>`null::uuid`.as('session_id'),
                athleteId: sql<string | null>`${aiMesocycleDrafts.athleteId}`.as('athlete_id'),
                // The proposed block name lives inside the jsonb proposal.
                name: sql<string | null>`${aiMesocycleDrafts.content}->>'name'`.as('name'),
                // Qualified on purpose — see the note on the session branch.
                title: sql<string | null>`(
                    select m."content" from "ai_mesocycle_draft_messages" m
                    where m."draft_id" = ${aiMesocycleDrafts}."id" and m."role" = 'user'
                    order by m."position" limit 1
                )`.as('title'),
                messageCount: sql<number>`(
                    select count(*) from "ai_mesocycle_draft_messages" m where m."draft_id" = ${aiMesocycleDrafts}."id"
                )::int`.as('message_count'),
                createdAt: aiMesocycleDrafts.createdAt,
                updatedAt: aiMesocycleDrafts.updatedAt,
            })
            .from(aiMesocycleDrafts)
            .where(and(...conditions))
    }
}

/** Keyset: rows strictly "after" the cursor under (updatedAt, id) DESC. */
function keyset(updatedAt: PgColumn, id: PgColumn, cursor: AiDraftHistoryCursor): SQL {
    return sql`(${updatedAt}, ${id}) < (${cursor.updatedAt.toISOString()}::timestamptz, ${cursor.id}::uuid)`
}
