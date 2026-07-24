import { RangeVO, parseRangeText } from './range.vo'
import { WeightVO, type WeightUnit } from './weight.vo'

/** A planned weight target in kilograms: `50` or `50-55`. */
export class WeightRangeVO extends RangeVO<WeightVO> {
    static create(minKg: number, maxKg: number = minKg): WeightRangeVO {
        return new WeightRangeVO({
            min: WeightVO.create(minKg),
            max: WeightVO.create(maxKg),
        })
    }

    /**
     * Build from the `50` / `50-55` notation in the given unit. Both bounds are
     * converted, so a range entered in pounds stays a range once it is kg.
     */
    static parse(text: string, unit: WeightUnit = 'kg'): WeightRangeVO {
        const { min, max } = parseRangeText(text)

        return new WeightRangeVO({
            min: WeightVO.fromUnit(min, unit),
            max: WeightVO.fromUnit(max, unit),
        })
    }
}
