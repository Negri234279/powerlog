import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'

import type { AiProvider } from '../shared/ai-provider'
import {
    type AiError,
    InvalidApiKeyError,
    ModelNotAvailableError,
    ProviderQuotaExceededError,
    ProviderRateLimitedError,
    ProviderRequestRejectedError,
    ProviderTimeoutError,
    ProviderUnavailableError,
} from './ai.errors'

/** Long enough to be useful, short enough not to become the whole UI. */
const MAX_DETAIL_LENGTH = 300

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

/**
 * The provider's own human-readable explanation, dug out of its error body.
 * OpenAI puts it at `error.message`; Anthropic nests it one level deeper, at
 * `error.error.message`. Whitespace is collapsed and the text is capped, so a
 * chatty provider can't spill a wall of text into the UI.
 */
function providerMessageOf(error: unknown): string | undefined {
    let message: unknown

    if (error instanceof OpenAI.APIError) {
        message = (error.error as { message?: unknown } | undefined)?.message
    } else if (error instanceof Anthropic.APIError) {
        message = (error.error as { error?: { message?: unknown } } | undefined)?.error?.message
    }

    if (typeof message !== 'string') return undefined

    const cleaned = message.replace(/\s+/g, ' ').trim()

    return cleaned === '' ? undefined : cleaned.slice(0, MAX_DETAIL_LENGTH)
}

function isBillingFailure({ code, type }: ProviderApiError): boolean {
    // OpenAI signals an exhausted account with `insufficient_quota` on a 429;
    // Anthropic uses a `billing_error` type, which shares HTTP 403 with a plain
    // permission error.
    return code === 'insufficient_quota' || type === 'billing_error'
}

/**
 * Normalises a provider SDK failure into an `AiError`, carrying the provider's
 * own explanation where it has one. Returns `undefined` only when the failure
 * came from somewhere else entirely (a bug in our code, say), so it can bubble
 * up as an internal error rather than be disguised as a provider problem.
 */
export function mapProviderError(provider: AiProvider, error: unknown): AiError | undefined {
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

    // Anthropic answers a spent credit balance with a 400 `invalid_request_error`
    // — the very shape it uses for a malformed request. The two cannot be told
    // apart here, so pass the provider's own message through instead of guessing.
    if (status === 400) return new ProviderRequestRejectedError(provider, providerMessageOf(error))

    return undefined
}

/**
 * Runs a provider SDK call, translating known failures into `AiError`s. Anything
 * unrecognised is rethrown untouched (see `mapProviderError`).
 */
export async function callProvider<T>(provider: AiProvider, call: () => Promise<T>): Promise<T> {
    try {
        return await call()
    } catch (error) {
        const mapped = mapProviderError(provider, error)
        if (mapped) throw mapped

        throw error
    }
}
