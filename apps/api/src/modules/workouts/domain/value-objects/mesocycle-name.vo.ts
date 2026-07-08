import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidMesocycleNameError } from '../errors/workouts.errors'

const MIN_LENGTH = 1
const MAX_LENGTH = 100

/**
 * A mesocycle's display name. `create` trims, then validates a non-empty
 * 1–100 char string, so any `MesocycleNameVO` is already canonical.
 */
export class MesocycleNameVO extends ValueObject<string> {
    static create(raw: string): MesocycleNameVO {
        return new MesocycleNameVO(raw.trim())
    }

    override equals(other: MesocycleNameVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: string): void {
        if (value.length < MIN_LENGTH || value.length > MAX_LENGTH) {
            throw new InvalidMesocycleNameError()
        }
    }
}
