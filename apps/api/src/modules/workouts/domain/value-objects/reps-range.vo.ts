import { RangeVO, parseRangeText } from './range.vo'
import { RepsVO } from './reps.vo'

/** A planned repetition target: `5` or `5-8`. */
export class RepsRangeVO extends RangeVO<RepsVO> {
    static create(min: number, max: number = min): RepsRangeVO {
        return new RepsRangeVO({
            min: RepsVO.create(min),
            max: RepsVO.create(max),
        })
    }

    /** Build from the `5` / `5-8` notation. */
    static parse(text: string): RepsRangeVO {
        const { min, max } = parseRangeText(text)
        return RepsRangeVO.create(min, max)
    }
}
