import { randomBytes } from 'node:crypto'

import { ConfigService } from '@nestjs/config'
import { describe, expect, it } from 'vitest'

import type { Env } from '../../../../config/env'
import { AiEncryptionKeyMisconfiguredError, InvalidEncryptedSecretError } from '../../domain/errors/ai-settings.errors'
import { ApiKeyVO } from '../../domain/value-objects/api-key.vo'
import { EncryptedSecretVO } from '../../domain/value-objects/encrypted-secret.vo'
import { AesGcmSecretCipher } from './aes-gcm-secret-cipher'

const API_KEY = 'sk-test-0123456789abcdef'

const masterKey = () => randomBytes(32).toString('base64')

/** A real ConfigService over a literal env — no mock, no cast. */
const cipherWith = (aiEncryptionKey: string) =>
    new AesGcmSecretCipher(new ConfigService<Env, true>({ AI_ENCRYPTION_KEY: aiEncryptionKey }))

describe('AesGcmSecretCipher', () => {
    it('round-trips an API key', () => {
        const cipher = cipherWith(masterKey())

        const decrypted = cipher.decrypt(cipher.encrypt(ApiKeyVO.create(API_KEY)))

        expect(decrypted.value).toBe(API_KEY)
    })

    it('never stores the key in the clear', () => {
        const encrypted = cipherWith(masterKey()).encrypt(ApiKeyVO.create(API_KEY))

        expect(encrypted.ciphertext).not.toContain(API_KEY)
        expect(Buffer.from(encrypted.ciphertext, 'base64').toString('utf8')).not.toBe(API_KEY)
    })

    it('encrypts the same key to a different ciphertext each time', () => {
        const cipher = cipherWith(masterKey())

        const first = cipher.encrypt(ApiKeyVO.create(API_KEY))
        const second = cipher.encrypt(ApiKeyVO.create(API_KEY))

        // A fresh IV per encryption: two users with the same key don't collide.
        expect(first.iv).not.toBe(second.iv)
        expect(first.ciphertext).not.toBe(second.ciphertext)
    })

    it('refuses to decrypt a tampered ciphertext', () => {
        const cipher = cipherWith(masterKey())
        const encrypted = cipher.encrypt(ApiKeyVO.create(API_KEY))

        const tampered = EncryptedSecretVO.create({
            ciphertext: Buffer.from('sk-attacker-0123456789ab', 'utf8').toString('base64'),
            iv: encrypted.iv,
            authTag: encrypted.authTag,
        })

        expect(() => cipher.decrypt(tampered)).toThrow(InvalidEncryptedSecretError)
    })

    it('refuses to decrypt with a different master key', () => {
        const encrypted = cipherWith(masterKey()).encrypt(ApiKeyVO.create(API_KEY))

        // Rotating AI_ENCRYPTION_KEY orphans every stored key — loudly, not silently.
        expect(() => cipherWith(masterKey()).decrypt(encrypted)).toThrow(InvalidEncryptedSecretError)
    })

    it('reports a missing master key instead of encrypting with nothing', () => {
        expect(() => cipherWith('').encrypt(ApiKeyVO.create(API_KEY))).toThrow(AiEncryptionKeyMisconfiguredError)
    })

    it('reports a master key of the wrong size', () => {
        expect(() => cipherWith(randomBytes(16).toString('base64')).encrypt(ApiKeyVO.create(API_KEY))).toThrow(
            AiEncryptionKeyMisconfiguredError,
        )
    })

    it('is constructible without a master key, so the app can boot without AI', () => {
        expect(() => cipherWith('')).not.toThrow()
    })
})
