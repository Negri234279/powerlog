import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidRirError } from '../errors/workouts.errors'

const MIN = 0
const MAX = 50

/** Reps In Reserve (whole number, 0–50) — an alternative to RPE. */
export class RirVO extends ValueObject<number> {
    static create(rir: number): RirVO {
        return new RirVO(rir)
    }

    override equals(other: RirVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: number): void {
        if (!Number.isInteger(value) || value < MIN || value > MAX) {
            throw new InvalidRirError()
        }
    }
}
