import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { Env } from '../../../../config/env'
import { SecretCipher } from '../../application/ports/secret-cipher.port'
import { AiEncryptionKeyMisconfiguredError, InvalidEncryptedSecretError } from '../../domain/errors/ai-settings.errors'
import { ApiKeyVO } from '../../domain/value-objects/api-key.vo'
import { EncryptedSecretVO } from '../../domain/value-objects/encrypted-secret.vo'

const ALGORITHM = 'aes-256-gcm'
const KEY_BYTES = 32
/** 96 bits, the IV size AES-GCM is specified and optimised for. */
const IV_BYTES = 12

/**
 * AES-256-GCM, with a master key from `AI_ENCRYPTION_KEY` (base64, 32 bytes).
 * GCM is authenticated: a tampered ciphertext fails to decrypt rather than
 * yielding garbage, and a fresh random IV per encryption means storing the same
 * key twice never produces the same row.
 *
 * The master key is resolved and validated **lazily**, on first use rather than
 * at construction. An API that boots without `AI_ENCRYPTION_KEY` should serve
 * every other feature normally and only fail the AI settings calls — not refuse
 * to start.
 */
@Injectable()
export class AesGcmSecretCipher extends SecretCipher {
    private masterKey?: Buffer

    constructor(private readonly config: ConfigService<Env, true>) {
        super()
    }

    encrypt(apiKey: ApiKeyVO): EncryptedSecretVO {
        const iv = randomBytes(IV_BYTES)
        const cipher = createCipheriv(ALGORITHM, this.key(), iv)
        const ciphertext = Buffer.concat([cipher.update(apiKey.value, 'utf8'), cipher.final()])

        return EncryptedSecretVO.create({
            ciphertext: ciphertext.toString('base64'),
            iv: iv.toString('base64'),
            authTag: cipher.getAuthTag().toString('base64'),
        })
    }

    decrypt(secret: EncryptedSecretVO): ApiKeyVO {
        // The master key is resolved outside the try: a misconfigured deployment
        // must surface as itself, not be mistaken for a corrupted row.
        const key = this.key()

        try {
            const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(secret.iv, 'base64'))
            decipher.setAuthTag(Buffer.from(secret.authTag, 'base64'))

            const plaintext = Buffer.concat([
                decipher.update(Buffer.from(secret.ciphertext, 'base64')),
                decipher.final(),
            ])

            return ApiKeyVO.create(plaintext.toString('utf8'))
        } catch {
            // Three ways to land here, all meaning the stored row is unusable:
            // an IV or auth tag of the wrong size (rejected by `createDecipheriv`
            // and `setAuthTag`), or an auth tag that doesn't match (rejected by
            // `final()`) — a tampered row, or a rotated master key.
            throw new InvalidEncryptedSecretError()
        }
    }

    /** Decode + validate once, then cache. Throws if the env var is unusable. */
    private key(): Buffer {
        if (this.masterKey) return this.masterKey

        const raw = this.config.get('AI_ENCRYPTION_KEY', { infer: true })
        if (!raw) throw new AiEncryptionKeyMisconfiguredError('AI_ENCRYPTION_KEY is not set.')

        const decoded = Buffer.from(raw, 'base64')
        if (decoded.length !== KEY_BYTES) {
            throw new AiEncryptionKeyMisconfiguredError(
                `AI_ENCRYPTION_KEY must be ${KEY_BYTES} bytes encoded as base64 (got ${decoded.length}).`,
            )
        }

        this.masterKey = decoded

        return this.masterKey
    }
}
