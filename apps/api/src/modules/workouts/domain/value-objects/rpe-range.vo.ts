import { RangeVO, parseRangeText } from './range.vo'
import { RpeVO } from './rpe.vo'

/** A planned RPE target: `8` or `7-8` (half-point steps, as `RpeVO`). */
export class RpeRangeVO extends RangeVO<RpeVO> {
    static create(min: number, max: number = min): RpeRangeVO {
        return new RpeRangeVO({
            min: RpeVO.create(min),
            max: RpeVO.create(max),
        })
    }

    /** Build from the `8` / `7-8` notation. */
    static parse(text: string): RpeRangeVO {
        const { min, max } = parseRangeText(text)
        return RpeRangeVO.create(min, max)
    }
}
