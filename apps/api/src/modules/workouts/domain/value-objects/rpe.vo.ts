import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidRpeError } from '../errors/workouts.errors'

const MIN = 0
const MAX = 10

/** Rate of Perceived Exertion (0–10, in half-point steps). */
export class RpeVO extends ValueObject<number> {
    static create(rpe: number): RpeVO {
        return new RpeVO(rpe)
    }

    override equals(other: RpeVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: number): void {
        const isHalfStep = (value * 2) % 1 === 0
        if (!Number.isFinite(value) || value < MIN || value > MAX || !isHalfStep) {
            throw new InvalidRpeError()
        }
    }
}
