import { DomainError } from '../shared/domain/domain-error'

/**
 * Errors raised by the LLM provider layer. Every failure the providers can hand
 * us is normalised into one of these by `mapProviderError`, so callers never see
 * an `OpenAI.APIError` or an `Anthropic.APIError` and the `GlobalExceptionFilter`
 * maps them to a stable `extensions.code` like any other domain error.
 *
 * Messages are client-safe: they never echo the provider's response body, which
 * can carry the organisation name or fragments of the request.
 */
export abstract class AiError extends DomainError {}

/** The user's API key was rejected (revoked, mistyped, wrong provider). */
export class InvalidApiKeyError extends AiError {
    readonly code = 'AI_PROVIDER_UNAUTHORIZED'

    constructor() {
        super('The API key was rejected by the provider.')
    }
}

/** Too many requests. The user's own plan sets this limit, not powerlog. */
export class ProviderRateLimitedError extends AiError {
    readonly code = 'AI_PROVIDER_RATE_LIMITED'

    constructor() {
        super('The provider is rate limiting requests. Try again in a moment.')
    }
}

/** The user's account is out of credit or over its billing quota. */
export class ProviderQuotaExceededError extends AiError {
    readonly code = 'AI_PROVIDER_QUOTA_EXCEEDED'

    constructor() {
        super('The provider account has no quota left. Check its billing settings.')
    }
}

/** The chosen model does not exist, or the key has no access to it. */
export class ModelNotAvailableError extends AiError {
    readonly code = 'AI_MODEL_NOT_AVAILABLE'

    constructor() {
        super('The selected model is not available for this API key.')
    }
}

/** The provider did not answer in time. */
export class ProviderTimeoutError extends AiError {
    readonly code = 'AI_PROVIDER_TIMEOUT'

    constructor() {
        super('The provider took too long to respond.')
    }
}

/** The provider is down, overloaded, or unreachable. */
export class ProviderUnavailableError extends AiError {
    readonly code = 'AI_PROVIDER_UNAVAILABLE'

    constructor() {
        super('The provider is temporarily unavailable.')
    }
}

/**
 * The model declined to answer. Anthropic surfaces this as a successful HTTP 200
 * with `stop_reason: "refusal"`, so it is a normal outcome to handle, not an
 * HTTP failure.
 */
export class ProviderRefusedError extends AiError {
    readonly code = 'AI_PROVIDER_REFUSED'

    constructor() {
        super('The model declined to answer this request.')
    }
}

/** The request named a provider powerlog has no adapter for. */
export class UnsupportedProviderError extends AiError {
    readonly code = 'AI_PROVIDER_UNSUPPORTED'

    constructor(provider: string) {
        super(`Unsupported AI provider: ${provider}.`)
    }
}
