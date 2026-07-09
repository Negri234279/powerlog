import type { ApiKeyVO } from '../../domain/value-objects/api-key.vo'
import type { EncryptedSecretVO } from '../../domain/value-objects/encrypted-secret.vo'

/**
 * Reversible encryption for secrets that must be *used* later, not merely
 * compared — a provider API key has to be handed back to the provider, so
 * hashing (as with passwords and refresh tokens) is not an option here.
 *
 * The adapter owns the algorithm and the master key.
 */
export abstract class SecretCipher {
    abstract encrypt(apiKey: ApiKeyVO): EncryptedSecretVO
    abstract decrypt(secret: EncryptedSecretVO): ApiKeyVO
}
