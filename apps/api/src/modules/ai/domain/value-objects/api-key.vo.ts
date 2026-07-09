import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidApiKeyFormatError } from '../errors/ai-settings.errors'

const MIN_LENGTH = 20
const MAX_LENGTH = 512

/**
 * A provider API key, in the clear. It exists only in memory, between the
 * request that carries it and the cipher that encrypts it — it is never stored,
 * returned or logged in this form.
 *
 * The invariant is deliberately shape-only (length, no whitespace): prefixes
 * like `sk-` or `sk-ant-` are provider conventions that change, and the real
 * check is that the provider itself accepts the key. `toJSON` is overridden so
 * that a VO reaching a logger or an error payload by accident serialises to a
 * placeholder instead of the secret.
 */
export class ApiKeyVO extends ValueObject<string> {
    static create(raw: string): ApiKeyVO {
        return new ApiKeyVO(raw.trim())
    }

    /** The last four characters, the only part ever shown back to the user. */
    get last4(): string {
        return this.value.slice(-4)
    }

    override equals(other: ApiKeyVO): boolean {
        return this.value === other.value
    }

    toJSON(): string {
        return '[redacted]'
    }

    protected override assertIsValid(value: string): void {
        if (value.length < MIN_LENGTH || value.length > MAX_LENGTH || /\s/.test(value)) {
            throw new InvalidApiKeyFormatError()
        }
    }
}
