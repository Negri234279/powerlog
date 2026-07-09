import { SecretCipher } from '../../../src/modules/ai/application/ports/secret-cipher.port'
import { ApiKeyVO } from '../../../src/modules/ai/domain/value-objects/api-key.vo'
import { EncryptedSecretVO } from '../../../src/modules/ai/domain/value-objects/encrypted-secret.vo'

/**
 * Reversible, deterministic stand-in for the real AES-GCM cipher: base64 is not
 * encryption, but application tests care that the key round-trips and that the
 * plaintext never reaches the repository — not about the algorithm, which its
 * own spec covers with real crypto.
 */
export class FakeSecretCipher extends SecretCipher {
    encrypt(apiKey: ApiKeyVO): EncryptedSecretVO {
        return EncryptedSecretVO.create({
            ciphertext: Buffer.from(apiKey.value, 'utf8').toString('base64'),
            iv: 'fake-iv',
            authTag: 'fake-auth-tag',
        })
    }

    decrypt(secret: EncryptedSecretVO): ApiKeyVO {
        return ApiKeyVO.create(Buffer.from(secret.ciphertext, 'base64').toString('utf8'))
    }
}
