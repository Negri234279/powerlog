import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

import {
    type AiError,
    InvalidApiKeyError,
    ModelNotAvailableError,
    ProviderQuotaExceededError,
    ProviderRateLimitedError,
    ProviderTimeoutError,
    ProviderUnavailableError,
} from './ai.errors'

/**
 * The fields both SDKs expose on their typed API errors. Read straight off the
 * typed exception classes — never parsed out of the error message.
 */
interface ProviderApiError {
    status: number | undefined
    /** OpenAI's machine-readable error code, e.g. `insufficient_quota`. */
    code: string | undefined
    /** The API error type, e.g. `billing_error` / `rate_limit_error`. */
    type: string | undefined
}

function readApiError(error: unknown): ProviderApiError | undefined {
    // Anthropic types `type` but has no `code`; OpenAI types both.
    if (error instanceof OpenAI.APIError) {
        return { status: error.status, code: error.code ?? undefined, type: error.type }
    }

    if (error instanceof Anthropic.APIError) {
        return { status: error.status, code: undefined, type: error.type ?? undefined }
    }

    return undefined
}

function isBillingFailure({ code, type }: ProviderApiError): boolean {
    // OpenAI signals an exhausted account with `insufficient_quota` on a 429;
    // Anthropic uses a `billing_error` type, which shares HTTP 403 with a plain
    // permission error.
    return code === 'insufficient_quota' || type === 'billing_error'
}

/**
 * Normalises a provider SDK failure into an `AiError`, or returns `undefined`
 * when the failure is not something the user can act on — a malformed request,
 * for instance, is our bug. Those are deliberately left unmapped so they bubble
 * up as an internal error and get logged, traced and counted rather than being
 * disguised as "the provider is unavailable".
 */
export function mapProviderError(error: unknown): AiError | undefined {
    // Ordered before APIConnectionError: the timeout error extends it.
    if (error instanceof OpenAI.APIConnectionTimeoutError || error instanceof Anthropic.APIConnectionTimeoutError) {
        return new ProviderTimeoutError()
    }

    if (error instanceof OpenAI.APIConnectionError || error instanceof Anthropic.APIConnectionError) {
        return new ProviderUnavailableError()
    }

    const apiError = readApiError(error)
    if (!apiError) return undefined

    const { status } = apiError

    if (status === 401) return new InvalidApiKeyError()
    if (status === 403) return isBillingFailure(apiError) ? new ProviderQuotaExceededError() : new InvalidApiKeyError()
    if (status === 404) return new ModelNotAvailableError()
    if (status === 408) return new ProviderTimeoutError()
    if (status === 429)
        return isBillingFailure(apiError) ? new ProviderQuotaExceededError() : new ProviderRateLimitedError()

    // 500 (api_error) and 529 (overloaded_error) are both transient.
    if (status !== undefined && status >= 500) return new ProviderUnavailableError()

    return undefined
}

/**
 * Runs a provider SDK call, translating known failures into `AiError`s. Anything
 * unrecognised is rethrown untouched (see `mapProviderError`).
 */
export async function callProvider<T>(call: () => Promise<T>): Promise<T> {
    try {
        return await call()
    } catch (error) {
        const mapped = mapProviderError(error)
        if (mapped) throw mapped

        throw error
    }
}
