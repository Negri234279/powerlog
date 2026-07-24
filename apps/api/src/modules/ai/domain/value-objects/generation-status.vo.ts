import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidAiGenerationStatusError } from '../errors/ai-generation.errors'

export const GENERATION_STATUSES = ['queued', 'running', 'succeeded', 'failed'] as const

export type GenerationStatusValue = (typeof GENERATION_STATUSES)[number]

/**
 * Where a generation is in its life: `queued` from the moment the mutation
 * returns, `running` once a worker picked it up, then `succeeded` (a draft
 * exists) or `failed`. Both end states are terminal — the outcome of an LLM call
 * is never revised, only replaced by a new generation.
 */
export class GenerationStatusVO extends ValueObject<GenerationStatusValue> {
    static create(raw: string): GenerationStatusVO {
        return new GenerationStatusVO(raw as GenerationStatusValue)
    }

    static queued(): GenerationStatusVO {
        return new GenerationStatusVO('queued')
    }

    get isQueued(): boolean {
        return this.value === 'queued'
    }

    get isRunning(): boolean {
        return this.value === 'running'
    }

    /** Finished, whatever the outcome. Nothing may move it after this. */
    get isSettled(): boolean {
        return this.value === 'succeeded' || this.value === 'failed'
    }

    override equals(other: GenerationStatusVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: GenerationStatusValue): void {
        if (!(GENERATION_STATUSES as readonly string[]).includes(value)) {
            throw new InvalidAiGenerationStatusError(value)
        }
    }
}
