import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidHeightError } from '../errors/profile.errors'

const MIN_CM = 50
const MAX_CM = 300

/** Body height in whole centimetres (50–300). */
export class HeightVO extends ValueObject<number> {
    static create(cm: number): HeightVO {
        return new HeightVO(cm)
    }

    override equals(other: HeightVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: number): void {
        if (!Number.isInteger(value) || value < MIN_CM || value > MAX_CM) {
            throw new InvalidHeightError()
        }
    }
}
