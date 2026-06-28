import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidPersonNameError } from '../errors/profile.errors'

const MAX_LENGTH = 60

/** A first or last name (optional on the profile). Trimmed; 1–60 chars. */
export class PersonNameVO extends ValueObject<string> {
    static create(raw: string): PersonNameVO {
        return new PersonNameVO(raw.trim())
    }

    override equals(other: PersonNameVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: string): void {
        if (value.length < 1 || value.length > MAX_LENGTH) {
            throw new InvalidPersonNameError()
        }
    }
}
