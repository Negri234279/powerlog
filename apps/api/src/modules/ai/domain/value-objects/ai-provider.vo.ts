import { type AiProvider, isAiProvider } from '../../../../shared/ai-provider'
import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidAiProviderError } from '../errors/ai-settings.errors'

/**
 * Which LLM provider a stored configuration belongs to. Half of the aggregate's
 * identity (the other half is the userId).
 */
export class AiProviderVO extends ValueObject<AiProvider> {
    static create(raw: string): AiProviderVO {
        return new AiProviderVO(raw as AiProvider)
    }

    override equals(other: AiProviderVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: AiProvider): void {
        if (!isAiProvider(value)) {
            throw new InvalidAiProviderError(value)
        }
    }
}
