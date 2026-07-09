import { AiProviderConfigAggregate } from '../../../src/modules/ai/domain/entities/ai-provider-config.entity'
import { AiProviderVO } from '../../../src/modules/ai/domain/value-objects/ai-provider.vo'
import { EncryptedSecretVO } from '../../../src/modules/ai/domain/value-objects/encrypted-secret.vo'
import type { AiProvider } from '../../../src/shared/ai-provider'

const DEFAULT_USER_ID = '11111111-1111-4111-8111-111111111111'
const DEFAULT_NOW = new Date('2026-01-01T00:00:00.000Z')

/** Matches what `FakeSecretCipher` produces for the key "sk-test-key-0000abcd". */
const encryptedSecret = (rawKey: string) =>
    EncryptedSecretVO.create({
        ciphertext: Buffer.from(rawKey, 'utf8').toString('base64'),
        iv: 'fake-iv',
        authTag: 'fake-auth-tag',
    })

interface AiProviderConfigOverrides {
    userId?: string
    provider?: AiProvider
    rawKey?: string
    model?: string | null
    isDefault?: boolean
}

function create(overrides: AiProviderConfigOverrides = {}): AiProviderConfigAggregate {
    const rawKey = overrides.rawKey ?? 'sk-test-key-0000abcd'

    return AiProviderConfigAggregate.create({
        userId: overrides.userId ?? DEFAULT_USER_ID,
        provider: AiProviderVO.create(overrides.provider ?? 'openai'),
        encryptedKey: encryptedSecret(rawKey),
        keyLast4: rawKey.slice(-4),
        model: overrides.model ?? null,
        isDefault: overrides.isDefault ?? false,
        now: DEFAULT_NOW,
    })
}

export const AiProviderConfigMother = {
    /** A configured provider with a stored key, enabled, no model picked. */
    create,
    openai: (overrides: AiProviderConfigOverrides = {}) => create({ ...overrides, provider: 'openai' }),
    anthropic: (overrides: AiProviderConfigOverrides = {}) => create({ ...overrides, provider: 'anthropic' }),
}

export const AI_MOTHER_DEFAULTS = { userId: DEFAULT_USER_ID, now: DEFAULT_NOW }
