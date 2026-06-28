import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidBioError } from '../errors/profile.errors'

const MAX_LENGTH = 1000

/** Free-text biography (optional). Trimmed; up to 1000 chars. */
export class BioVO extends ValueObject<string> {
    static create(raw: string): BioVO {
        return new BioVO(raw.trim())
    }

    override equals(other: BioVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: string): void {
        if (value.length > MAX_LENGTH) {
            throw new InvalidBioError()
        }
    }
}
