import type { AiProvider } from '../../../../shared/ai-provider'
import type { PlanDraftStatusValue } from '../../domain/value-objects/plan-draft-status.vo'

/** Which of the two things the model was asked to design. */
export const AI_DRAFT_KINDS = ['session', 'mesocycle'] as const

export type AiDraftKind = (typeof AI_DRAFT_KINDS)[number]

/** Keyset cursor: the (updatedAt, id) of the last row of the previous page. */
export interface AiDraftHistoryCursor {
    updatedAt: Date
    id: string
}

/** Filter for the conversation history: always user-scoped, keyset-paginated. */
export interface AiDraftHistoryFilter {
    /** The user who asked for the draft — the coach, when one designed for an athlete. */
    userId: string
    /** Page size (the impl fetches one extra row to compute `hasNextPage`). */
    limit: number
    kind?: AiDraftKind
    status?: PlanDraftStatusValue
    /** Only drafts programming this session. Meaningless for mesocycle drafts. */
    sessionId?: string
    /**
     * Only mesocycle drafts designed for this athlete. `'self'` is the caller's own
     * block (`athlete_id is null`) — the distinction a coach needs to separate their
     * own training from their athletes'.
     */
    athleteId?: string | 'self'
    cursor?: AiDraftHistoryCursor
}

/**
 * One line of the history list. Deliberately thin: the thread and the proposal
 * are only read on the detail view, and pulling them here would mean hydrating
 * every draft on the page.
 */
export interface AiDraftSummaryRow {
    id: string
    kind: AiDraftKind
    status: PlanDraftStatusValue
    provider: AiProvider
    model: string
    /** The session programmed; null on mesocycle drafts. */
    sessionId: string | null
    /** The athlete a coach designed for; null on session drafts and own blocks. */
    athleteId: string | null
    /** The name the model proposed for the block; null on session drafts. */
    name: string | null
    /** The resolved draft this one continues, if any — the line shows the chain. */
    parentDraftId: string | null
    /**
     * What the athlete asked for in their own words — the first `user` turn. Null
     * when the draft was generated without a request, which is the common case for
     * a session: the UI falls back to naming the subject.
     */
    title: string | null
    messageCount: number
    createdAt: Date
    updatedAt: Date
}

/** A keyset page: trimmed rows plus whether another page follows. */
export interface AiDraftHistorySlice {
    items: AiDraftSummaryRow[]
    hasNextPage: boolean
}

/**
 * Read-only port for the AI conversation history. Session and mesocycle drafts
 * live in separate tables but are one feed to the user, so the impl unions them
 * and lets Postgres do the ordering — merging two paginated lists in memory
 * cannot produce a correct keyset page.
 *
 * Infra provides the Drizzle impl; cursor encoding/decoding lives in the
 * application layer.
 */
export abstract class AiDraftHistoryReadModel {
    abstract list(filter: AiDraftHistoryFilter): Promise<AiDraftHistorySlice>
}
