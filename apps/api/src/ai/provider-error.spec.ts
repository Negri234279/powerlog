import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { describe, expect, it } from 'vitest'

import {
    InvalidApiKeyError,
    ModelNotAvailableError,
    ProviderQuotaExceededError,
    ProviderRateLimitedError,
    ProviderRequestRejectedError,
    ProviderTimeoutError,
    ProviderUnavailableError,
} from './ai.errors'
import { callProvider, mapProviderError as map } from './provider-error'

/** Most cases don't care which provider spoke; default to openai. */
const mapProviderError = (error: unknown, provider: 'openai' | 'anthropic' = 'openai') => map(provider, error)

/**
 * Errors are built with each SDK's own `APIError.generate`, the same factory the
 * client uses on a non-2xx response, so the tests exercise the real subclasses
 * and the real field extraction rather than a hand-rolled shape.
 */
const openAiError = (status: number, body: Record<string, unknown> = {}) =>
    OpenAI.APIError.generate(status, { error: body }, undefined, new Headers())

const anthropicError = (status: number, type?: string, message?: string) =>
    Anthropic.APIError.generate(status, { type: 'error', error: { type, message } }, undefined, new Headers())

describe('mapProviderError', () => {
    it('maps a rejected key to InvalidApiKeyError for either provider', () => {
        expect(mapProviderError(openAiError(401))).toBeInstanceOf(InvalidApiKeyError)
        expect(mapProviderError(anthropicError(401, 'authentication_error'))).toBeInstanceOf(InvalidApiKeyError)
    })

    it('maps an unknown model to ModelNotAvailableError', () => {
        expect(mapProviderError(openAiError(404))).toBeInstanceOf(ModelNotAvailableError)
        expect(mapProviderError(anthropicError(404, 'not_found_error'))).toBeInstanceOf(ModelNotAvailableError)
    })

    it('distinguishes an exhausted quota from plain rate limiting', () => {
        expect(mapProviderError(openAiError(429))).toBeInstanceOf(ProviderRateLimitedError)
        expect(mapProviderError(openAiError(429, { code: 'insufficient_quota' }))).toBeInstanceOf(
            ProviderQuotaExceededError,
        )
        expect(mapProviderError(anthropicError(429, 'rate_limit_error'))).toBeInstanceOf(ProviderRateLimitedError)
    })

    it('maps a billing failure to ProviderQuotaExceededError, not a permission error', () => {
        // Anthropic returns 403 for both billing and permission problems.
        expect(mapProviderError(anthropicError(403, 'billing_error'))).toBeInstanceOf(ProviderQuotaExceededError)
        expect(mapProviderError(anthropicError(403, 'permission_error'))).toBeInstanceOf(InvalidApiKeyError)
    })

    it('maps provider outages and overload to ProviderUnavailableError', () => {
        expect(mapProviderError(openAiError(500))).toBeInstanceOf(ProviderUnavailableError)
        expect(mapProviderError(anthropicError(529, 'overloaded_error'))).toBeInstanceOf(ProviderUnavailableError)
    })

    it('maps a timeout before treating it as a plain connection failure', () => {
        // APIConnectionTimeoutError extends APIConnectionError, so order matters.
        expect(mapProviderError(new OpenAI.APIConnectionTimeoutError({}))).toBeInstanceOf(ProviderTimeoutError)
        expect(mapProviderError(new Anthropic.APIConnectionTimeoutError({}))).toBeInstanceOf(ProviderTimeoutError)
    })

    it('maps an unreachable provider to ProviderUnavailableError', () => {
        expect(mapProviderError(new OpenAI.APIConnectionError({}))).toBeInstanceOf(ProviderUnavailableError)
        expect(mapProviderError(new Anthropic.APIConnectionError({}))).toBeInstanceOf(ProviderUnavailableError)
    })

    it('surfaces the provider’s own words when it rejects the request', () => {
        // Anthropic answers a spent credit balance with a 400, in the same shape
        // it uses for a malformed request. "Internal server error" told the user
        // nothing; the provider's sentence tells them exactly what to do.
        const spent = anthropicError(
            400,
            'invalid_request_error',
            'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.',
        )

        const mapped = mapProviderError(spent, 'anthropic')

        expect(mapped).toBeInstanceOf(ProviderRequestRejectedError)
        expect(mapped?.message).toContain('Anthropic:')
        expect(mapped?.message).toContain('credit balance is too low')
    })

    it('names the provider that spoke', () => {
        const mapped = mapProviderError(openAiError(400, { message: 'unsupported parameter' }), 'openai')

        expect(mapped?.message).toBe('OpenAI: unsupported parameter')
    })

    it('falls back to a plain message when the provider gives no reason', () => {
        expect(mapProviderError(openAiError(400))?.message).toBe('OpenAI rejected the request.')
    })

    it('collapses whitespace and caps a long provider message', () => {
        const rambling = openAiError(400, { message: `a\n\n  ${'x'.repeat(500)}` })

        const message = mapProviderError(rambling)!.message
        expect(message).not.toContain('\n')
        expect(message.length).toBeLessThan(340)
    })

    it('leaves failures that did not come from a provider unmapped', () => {
        // A bug in our own code must surface as an internal error rather than be
        // dressed up as a provider problem.
        expect(mapProviderError(new Error('boom'))).toBeUndefined()
    })
})

describe('callProvider', () => {
    it('returns the call result when it succeeds', async () => {
        await expect(callProvider('openai', async () => 'ok')).resolves.toBe('ok')
    })

    it('translates a known provider failure into a domain error', async () => {
        await expect(
            callProvider('openai', () => {
                throw openAiError(401)
            }),
        ).rejects.toBeInstanceOf(InvalidApiKeyError)
    })

    it('rethrows an unrecognised failure untouched', async () => {
        const bug = new TypeError('cannot read property of undefined')

        await expect(callProvider('openai', () => Promise.reject(bug))).rejects.toBe(bug)
    })
})
