import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidSexError } from '../errors/profile.errors'

export type SexValue = 'male' | 'female'

const VALID: readonly SexValue[] = ['male', 'female']

/**
 * Biological sex. Relevant for powerlifting scoring (DOTS/Wilks/IPF points) and
 * weight categories — kept deliberately binary for those formulas.
 */
export class SexVO extends ValueObject<SexValue> {
    static create(raw: string): SexVO {
        return new SexVO(raw as SexValue)
    }

    override equals(other: SexVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: SexValue): void {
        if (!VALID.includes(value)) {
            throw new InvalidSexError(value)
        }
    }
}
