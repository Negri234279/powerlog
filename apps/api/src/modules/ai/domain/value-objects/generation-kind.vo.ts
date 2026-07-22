import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidAiGenerationKindError } from '../errors/ai-generation.errors'

export const GENERATION_KINDS = [
    'session_plan',
    'session_plan_refinement',
    'mesocycle',
    'mesocycle_refinement',
] as const

export type GenerationKindValue = (typeof GENERATION_KINDS)[number]

/**
 * Which of the four LLM jobs this is. It decides the shape of the request the
 * generation carries and which handler the worker runs it through — and it is
 * what lets one queue, one row and one piece of UI serve all of them.
 */
export class GenerationKindVO extends ValueObject<GenerationKindValue> {
    static create(raw: string): GenerationKindVO {
        return new GenerationKindVO(raw as GenerationKindValue)
    }

    /** A refinement revises a draft that already exists, rather than making one. */
    get isRefinement(): boolean {
        return this.value === 'session_plan_refinement' || this.value === 'mesocycle_refinement'
    }

    override equals(other: GenerationKindVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: GenerationKindValue): void {
        if (!(GENERATION_KINDS as readonly string[]).includes(value)) {
            throw new InvalidAiGenerationKindError(value)
        }
    }
}
