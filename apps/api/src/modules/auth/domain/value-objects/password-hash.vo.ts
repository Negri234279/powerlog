import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidPasswordHashError } from '../errors/auth.errors'

/**
 * Wraps an already-hashed password (argon2 PHC string). The domain never sees
 * or stores plaintext — hashing happens in the infrastructure PasswordHasher.
 */
export class PasswordHashVO extends ValueObject<string> {
    /** Build from a hash produced by the PasswordHasher port. */
    static fromHash(hash: string): PasswordHashVO {
        return new PasswordHashVO(hash)
    }

    override equals(other: PasswordHashVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: string): void {
        if (!value.startsWith('$argon2')) {
            throw new InvalidPasswordHashError()
        }
    }
}
