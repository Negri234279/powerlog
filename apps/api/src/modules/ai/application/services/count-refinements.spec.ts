import { describe, expect, it } from 'vitest'

import type { PlanMessageRole } from '../../domain/entities/ai-plan-message.entity'
import { countRefinements } from './count-refinements'

const thread = (...roles: PlanMessageRole[]) => roles.map((role) => ({ role }))

describe('countRefinements', () => {
    it('is zero for a draft accepted as first proposed', () => {
        // Optional request + the one rationale every draft is born with.
        expect(countRefinements(thread('user', 'assistant'))).toBe(0)
        // Same, generated unprompted (no opening request).
        expect(countRefinements(thread('assistant'))).toBe(0)
    })

    it('counts one round per revision, independent of the opening request', () => {
        // request, rationale, refine-request, revised-rationale → one round.
        expect(countRefinements(thread('user', 'assistant', 'user', 'assistant'))).toBe(1)
        // No opening request, one refinement → still one round.
        expect(countRefinements(thread('assistant', 'user', 'assistant'))).toBe(1)
    })

    it('never goes negative on an empty thread', () => {
        expect(countRefinements([])).toBe(0)
    })
})
