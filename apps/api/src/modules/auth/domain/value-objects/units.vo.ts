import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidUnitsError } from '../errors/auth.errors'

export type UnitsValue = 'kg' | 'lb'

const VALID: readonly UnitsValue[] = ['kg', 'lb']

/** Unit preference value object ("kg" | "lb"). */
export class UnitsVO extends ValueObject<UnitsValue> {
    static create(raw: string): UnitsVO {
        return new UnitsVO(raw as UnitsValue)
    }

    /** Default for new registrations. */
    static default(): UnitsVO {
        return new UnitsVO('kg')
    }

    override equals(other: UnitsVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: UnitsValue): void {
        if (!VALID.includes(value)) {
            throw new InvalidUnitsError(value)
        }
    }
}
