import type { AthleteStrength, CatalogExercise } from '../../../shared/contracts/mesocycle-design-context'
import type { MesocycleDraftProposal } from '../domain/entities/ai-mesocycle-draft.entity'
import { expandMicrocycles } from '../domain/mesocycle-expander'
import { fillMesocycleLoads } from '../application/services/mesocycle-load-filler'
import { parseMesocycleResponse } from '../application/services/mesocycle-response.parser'
import { ModelAnswerRejection } from '../application/services/model-answer'
import { assertProgressionIsSound, evaluateMesocycleRules } from '../application/services/programming-rules'
import { goalToObjective } from '../application/services/programming-rules.config'

/**
 * The golden-set eval harness (IA.1/IA.2). Runs a raw model answer through the
 * exact same validation the designer applies — parse (IA.2 structure), load fill
 * (IA.5), the single-week rules (IA.2) and the progression rules (IA.7) — but
 * **collects** the outcome instead of throwing, so a script can score many
 * fixtures and report which rules trip.
 *
 * It measures whether an answer is *defensible*, not whether the programme is
 * good — that is all that can be automated without a coach reviewing it.
 */
export interface EvalContext {
    catalog: readonly CatalogExercise[]
    strength: readonly AthleteStrength[]
    /** The 0–6 offsets the block trains, as the athlete requested. */
    trainingDays: number[]
    weeks: number
    goal: string | null
}

export interface EvalResult {
    /** `pass` = defensible; `rejected` = a hard rule (or the parser) refused it. */
    outcome: 'pass' | 'rejected'
    /** The rejection message, when rejected — the rule that fired, in words. */
    reason?: string
    /** Soft rules tripped by an answer that was still accepted. */
    warnings: string[]
}

/**
 * Validate one model answer against a fixture's context. Never throws for a bad
 * answer: a parser/rule rejection comes back as `outcome: 'rejected'`. Only a
 * genuinely unexpected error (a bug in the harness) propagates.
 */
export function collectMesocycleViolations(text: string, context: EvalContext): EvalResult {
    const catalog = new Map(context.catalog.map((exercise) => [exercise.slug, exercise]))
    const objective = goalToObjective(context.goal)

    try {
        const parsed = parseMesocycleResponse(text, catalog, context.trainingDays)
        const days = fillMesocycleLoads(parsed.days, catalog, context.strength)
        const proposal: MesocycleDraftProposal = {
            name: parsed.name,
            days,
            progression: parsed.progression,
            microcycles: [],
        }

        const { warnings } = evaluateMesocycleRules(proposal, catalog, { objective })

        const microcycles = expandMicrocycles(days, parsed.progression, context.weeks, {
            e1rmBySlug: new Map(context.strength.map((lift) => [lift.slug, lift.e1rmKg])),
            equipmentBySlug: new Map(context.catalog.map((exercise) => [exercise.slug, exercise.equipment])),
            categoryBySlug: new Map(context.catalog.map((exercise) => [exercise.slug, exercise.category])),
        })

        assertProgressionIsSound(microcycles, catalog, {
            objective,
            weeks: context.weeks,
            progression: parsed.progression,
        })

        return {
            outcome: 'pass',
            warnings,
        }
    } catch (error) {
        if (error instanceof ModelAnswerRejection) {
            return {
                outcome: 'rejected',
                reason: error.message,
                warnings: [],
            }
        }

        throw error
    }
}
