import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidEncryptedSecretError } from '../errors/ai-settings.errors'

export interface EncryptedSecretProps {
    /** Base64 ciphertext. */
    ciphertext: string
    /** Base64 initialisation vector — fresh per encryption, never reused. */
    iv: string
    /** Base64 GCM authentication tag; detects tampering on decrypt. */
    authTag: string
}

/**
 * An encrypted secret at rest: the three pieces AES-GCM needs to decrypt and
 * verify. The domain treats them as opaque strings — it knows a secret is
 * encrypted, not *how*. The algorithm lives behind the `SecretCipher` port.
 */
export class EncryptedSecretVO extends ValueObject<EncryptedSecretProps> {
    static create(props: EncryptedSecretProps): EncryptedSecretVO {
        return new EncryptedSecretVO(props)
    }

    get ciphertext(): string {
        return this.value.ciphertext
    }
    get iv(): string {
        return this.value.iv
    }
    get authTag(): string {
        return this.value.authTag
    }

    override equals(other: EncryptedSecretVO): boolean {
        return this.ciphertext === other.ciphertext && this.iv === other.iv && this.authTag === other.authTag
    }

    protected override assertIsValid(value: EncryptedSecretProps): void {
        if (!value.ciphertext || !value.iv || !value.authTag) {
            throw new InvalidEncryptedSecretError()
        }
    }
}
