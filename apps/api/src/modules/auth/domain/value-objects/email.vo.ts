import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidEmailError } from '../errors/auth.errors'

// Pragmatic shape check; full RFC validation is neither feasible nor useful.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_LENGTH = 254

/**
 * Email value object. Normalizes (trim + lowercase) before validating, so the
 * rest of the domain can treat any `EmailVO` as already-valid and canonical.
 */
export class EmailVO extends ValueObject<string> {
    static create(raw: string): EmailVO {
        return new EmailVO(raw.trim().toLowerCase())
    }

    override equals(other: EmailVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: string): void {
        if (value.length > MAX_LENGTH || !EMAIL_RE.test(value)) {
            throw new InvalidEmailError(value)
        }
    }
}
