import type { PlanDraftStatusValue } from '../../../domain/value-objects/plan-draft-status.vo'
import type { AiDraftKind } from '../../ports/ai-draft-history.read-model'

/**
 * The caller's AI conversation history: every draft they asked the model for,
 * resolved or not, newest activity first. Keyset-paginated with optional filters.
 */
export class ListAiDraftsQuery {
    constructor(
        public readonly userId: string,
        public readonly limit: number,
        public readonly kind?: AiDraftKind | null,
        public readonly status?: PlanDraftStatusValue | null,
        public readonly sessionId?: string | null,
        /** An athlete's id, or `'self'` for the caller's own blocks. */
        public readonly athleteId?: string | 'self' | null,
        public readonly cursor?: string | null,
    ) {}
}
