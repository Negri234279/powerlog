import type { AiDraftSummaryRow } from '../../../src/modules/ai/application/ports/ai-draft-history.read-model'

const DEFAULT_UPDATED_AT = new Date('2026-01-01T00:00:00.000Z')

export const AiDraftSummaryMother = {
    /** A session draft line: the athlete asked for it and it is still open. */
    session(overrides: Partial<AiDraftSummaryRow> = {}): AiDraftSummaryRow {
        return {
            id: 'draft-1',
            kind: 'session',
            status: 'open',
            provider: 'openai',
            model: 'gpt-5',
            sessionId: 'session-1',
            athleteId: null,
            name: null,
            parentDraftId: null,
            title: 'more volume on bench',
            messageCount: 2,
            createdAt: DEFAULT_UPDATED_AT,
            updatedAt: DEFAULT_UPDATED_AT,
            ...overrides,
        }
    },

    /** A mesocycle draft line, by default one the caller designed for themselves. */
    mesocycle(overrides: Partial<AiDraftSummaryRow> = {}): AiDraftSummaryRow {
        return {
            id: 'draft-2',
            kind: 'mesocycle',
            status: 'open',
            provider: 'anthropic',
            model: 'claude-opus-4-8',
            sessionId: null,
            athleteId: null,
            name: 'Hypertrophy block',
            parentDraftId: null,
            title: '4 days a week, 8 weeks',
            messageCount: 2,
            createdAt: DEFAULT_UPDATED_AT,
            updatedAt: DEFAULT_UPDATED_AT,
            ...overrides,
        }
    },
}
