import { ValueObject } from '../../../../shared/domain/value-object'
import { MessageEmptyError, MessageTooLongError } from '../errors/chat.errors'

/**
 * A chat message body. Validated on construction: non-empty once trimmed and at
 * most {@link MessageBodyVO.MAX_LENGTH} characters (scale of the coach's private
 * note). The stored `.value` is the trimmed text — leading/trailing whitespace
 * never rides into persistence.
 */
export class MessageBodyVO extends ValueObject<string> {
    static readonly MAX_LENGTH = 4000

    private constructor(value: string) {
        super(value)
    }

    /** Build from raw input, trimming first so the invariant sees real content. */
    static create(raw: string): MessageBodyVO {
        return new MessageBodyVO(raw.trim())
    }

    protected override assertIsValid(value: string): void {
        if (value.length === 0) throw new MessageEmptyError()
        if (value.length > MessageBodyVO.MAX_LENGTH) throw new MessageTooLongError(MessageBodyVO.MAX_LENGTH)
    }

    override equals(other: ValueObject<string>): boolean {
        return other instanceof MessageBodyVO && other.value === this.value
    }
}
