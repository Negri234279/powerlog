import { DomainError } from '../../../../shared/domain/domain-error'

/**
 * Domain errors for the AI settings context. Each carries a stable `code` the
 * global exception filter maps to GraphQL/HTTP + metrics.
 */
export abstract class AiSettingsError extends DomainError {}

export class InvalidAiProviderError extends AiSettingsError {
    readonly code = 'INVALID_AI_PROVIDER'
    constructor(value: string) {
        super(`Invalid AI provider "${value}". Expected "openai" or "anthropic".`)
    }
}

/**
 * The submitted key is not shaped like an API key. The message never echoes the
 * value — a rejected key is still a secret.
 */
export class InvalidApiKeyFormatError extends AiSettingsError {
    readonly code = 'INVALID_API_KEY_FORMAT'
    constructor() {
        super('That does not look like an API key.')
    }
}

export class AiProviderConfigNotFoundError extends AiSettingsError {
    readonly code = 'AI_PROVIDER_CONFIG_NOT_FOUND'
    constructor() {
        super('No API key is configured for that provider.')
    }
}

/** A stored secret is missing one of its AES-GCM parts — corrupted at rest. */
export class InvalidEncryptedSecretError extends AiSettingsError {
    readonly code = 'INVALID_ENCRYPTED_SECRET'
    constructor() {
        super('The stored API key is corrupted.')
    }
}

/** `AI_ENCRYPTION_KEY` is missing or malformed — a deployment problem. */
export class AiEncryptionKeyMisconfiguredError extends AiSettingsError {
    readonly code = 'AI_ENCRYPTION_KEY_MISCONFIGURED'
    constructor(reason: string) {
        super(`AI key encryption is not configured correctly: ${reason}`)
    }
}
