import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidWeightError } from '../errors/workouts.errors'

export type WeightUnit = 'kg' | 'lb'

const LB_TO_KG = 0.45359237
const MAX_KG = 1000

/**
 * A weight in kilograms (the canonical stored unit). Pounds input is converted
 * via `fromUnit` at the boundary, so the domain only ever deals in kg.
 */
export class WeightVO extends ValueObject<number> {
    static create(kg: number): WeightVO {
        return new WeightVO(kg)
    }

    /** Build from a value in the given unit, converting to kg (rounded to 2 decimals). */
    static fromUnit(value: number, unit: WeightUnit): WeightVO {
        const kg = unit === 'lb' ? value * LB_TO_KG : value
        return new WeightVO(Math.round(kg * 100) / 100)
    }

    override equals(other: WeightVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: number): void {
        if (!Number.isFinite(value) || value < 0 || value > MAX_KG) {
            throw new InvalidWeightError()
        }
    }
}
