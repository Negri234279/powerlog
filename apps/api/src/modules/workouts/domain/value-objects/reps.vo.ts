import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidRepsError } from '../errors/workouts.errors'

const MIN = 1
const MAX = 1000

/** A repetition count (whole number, 1–1000). */
export class RepsVO extends ValueObject<number> {
    static create(reps: number): RepsVO {
        return new RepsVO(reps)
    }

    override equals(other: RepsVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: number): void {
        if (!Number.isInteger(value) || value < MIN || value > MAX) {
            throw new InvalidRepsError()
        }
    }
}
