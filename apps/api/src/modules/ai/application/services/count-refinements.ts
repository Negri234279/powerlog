import type { PlanMessageRole } from '../../domain/entities/ai-plan-message.entity'

/**
 * How many refinement rounds a draft's thread represents. Every draft is born
 * with exactly one assistant rationale, and each refinement adds exactly one
 * more, so the count is `assistant messages − 1` — independent of whether the
 * athlete opened with a free-text request (that message is optional).
 *
 * Counting `user` messages instead would be off by one whenever an initial
 * request exists, which is why the terminal-state metric derives it from the
 * assistant side.
 */
export function countRefinements(messages: readonly { role: PlanMessageRole }[]): number {
    const answers = messages.filter((message) => message.role === 'assistant').length

    return Math.max(0, answers - 1)
}
