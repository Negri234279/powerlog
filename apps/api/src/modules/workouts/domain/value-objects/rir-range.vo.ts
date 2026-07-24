import { RangeVO, parseRangeText } from './range.vo'
import { RirVO } from './rir.vo'

/** A planned reps-in-reserve target: `2` or `1-2`. */
export class RirRangeVO extends RangeVO<RirVO> {
    static create(min: number, max: number = min): RirRangeVO {
        return new RirRangeVO({
            min: RirVO.create(min),
            max: RirVO.create(max),
        })
    }

    /** Build from the `2` / `1-2` notation. */
    static parse(text: string): RirRangeVO {
        const { min, max } = parseRangeText(text)
        return RirRangeVO.create(min, max)
    }
}
