import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidTemplateNameError } from '../errors/workouts.errors'

const MIN_LENGTH = 1
const MAX_LENGTH = 100

/**
 * A workout template's display name. `create` trims, then validates a non-empty
 * 1–100 char string, so any `TemplateNameVO` is already canonical.
 */
export class TemplateNameVO extends ValueObject<string> {
    static create(raw: string): TemplateNameVO {
        return new TemplateNameVO(raw.trim())
    }

    override equals(other: TemplateNameVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: string): void {
        if (value.length < MIN_LENGTH || value.length > MAX_LENGTH) {
            throw new InvalidTemplateNameError()
        }
    }
}
