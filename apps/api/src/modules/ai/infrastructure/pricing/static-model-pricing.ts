import { Injectable } from '@nestjs/common'

import type { AiProvider } from '../../../../shared/ai-provider'
import { ModelPricing } from '../../application/ports/model-pricing.port'
import type { ModelPrice } from '../../domain/pricing/model-price'

/**
 * Published prices in USD per 1M tokens `{ input, output }`. Neither Anthropic
 * nor OpenAI exposes prices via API, so this table is the source of truth — keep
 * it in sync with the pricing pages when rates change:
 *   Anthropic → https://platform.claude.com/docs/en/about-claude/pricing
 *   OpenAI    → https://platform.openai.com/docs/pricing
 *
 * A model absent here records tokens with no cost (shown as "—") — never a wrong
 * number. OpenAI is left to be filled in with rates you can verify.
 */
const PRICES: Record<AiProvider, Record<string, ModelPrice>> = {
    anthropic: {
        'claude-fable-5': { inputUsdPerMTok: 10, outputUsdPerMTok: 50 },
        'claude-mythos-5': { inputUsdPerMTok: 10, outputUsdPerMTok: 50 },
        'claude-opus-5': { inputUsdPerMTok: 5, outputUsdPerMTok: 25 },
        'claude-opus-4-8': { inputUsdPerMTok: 5, outputUsdPerMTok: 25 },
        'claude-opus-4-7': { inputUsdPerMTok: 5, outputUsdPerMTok: 25 },
        'claude-opus-4-6': { inputUsdPerMTok: 5, outputUsdPerMTok: 25 },
        'claude-opus-4-5': { inputUsdPerMTok: 5, outputUsdPerMTok: 25 },
        'claude-sonnet-5': { inputUsdPerMTok: 3, outputUsdPerMTok: 15 },
        'claude-sonnet-4-6': { inputUsdPerMTok: 3, outputUsdPerMTok: 15 },
        'claude-haiku-4-5': { inputUsdPerMTok: 1, outputUsdPerMTok: 5 },
    },
    openai: {
        /*
         * GPT-5.6
         *
         * Estos son los precios de contexto corto.
         * En contexto largo, el precio cambia aunque el ID del modelo
         * continúe siendo el mismo.
         */
        'gpt-5.6-sol': {
            inputUsdPerMTok: 5,
            outputUsdPerMTok: 30,
        },
        'gpt-5.6-terra': {
            inputUsdPerMTok: 2.5,
            outputUsdPerMTok: 15,
        },
        'gpt-5.6-luna': {
            inputUsdPerMTok: 1,
            outputUsdPerMTok: 6,
        },

        /*
         * GPT-5.5
         */
        'gpt-5.5-pro-long-context': {
            inputUsdPerMTok: 60,
            outputUsdPerMTok: 270,
        },
        'gpt-5.5-long-context': {
            inputUsdPerMTok: 10,
            outputUsdPerMTok: 45,
        },
        'gpt-5.5-pro': {
            inputUsdPerMTok: 30,
            outputUsdPerMTok: 180,
        },
        'gpt-5.5': {
            inputUsdPerMTok: 5,
            outputUsdPerMTok: 30,
        },

        /*
         * GPT-5.4
         */
        'gpt-5.4-pro-long-context': {
            inputUsdPerMTok: 60,
            outputUsdPerMTok: 270,
        },
        'gpt-5.4-long-context': {
            inputUsdPerMTok: 5,
            outputUsdPerMTok: 22.5,
        },
        'gpt-5.4-pro': {
            inputUsdPerMTok: 30,
            outputUsdPerMTok: 180,
        },
        'gpt-5.4-mini': {
            inputUsdPerMTok: 0.75,
            outputUsdPerMTok: 4.5,
        },
        'gpt-5.4-nano': {
            inputUsdPerMTok: 0.2,
            outputUsdPerMTok: 1.25,
        },
        'gpt-5.4': {
            inputUsdPerMTok: 2.5,
            outputUsdPerMTok: 15,
        },

        /*
         * GPT-5.3
         */
        'gpt-5.3-chat-latest': {
            inputUsdPerMTok: 1.75,
            outputUsdPerMTok: 14,
        },
        'gpt-5.3-codex': {
            inputUsdPerMTok: 1.75,
            outputUsdPerMTok: 14,
        },

        /*
         * GPT-5.2
         */
        'gpt-5.2-pro': {
            inputUsdPerMTok: 21,
            outputUsdPerMTok: 168,
        },
        'gpt-5.2-chat-latest': {
            inputUsdPerMTok: 1.75,
            outputUsdPerMTok: 14,
        },
        'gpt-5.2-codex': {
            inputUsdPerMTok: 1.75,
            outputUsdPerMTok: 14,
        },
        'gpt-5.2': {
            inputUsdPerMTok: 1.75,
            outputUsdPerMTok: 14,
        },

        /*
         * GPT-5.1
         */
        'gpt-5.1-codex-mini': {
            inputUsdPerMTok: 0.25,
            outputUsdPerMTok: 2,
        },
        'gpt-5.1-codex-max': {
            inputUsdPerMTok: 1.25,
            outputUsdPerMTok: 10,
        },
        'gpt-5.1-chat-latest': {
            inputUsdPerMTok: 1.25,
            outputUsdPerMTok: 10,
        },
        'gpt-5.1-codex': {
            inputUsdPerMTok: 1.25,
            outputUsdPerMTok: 10,
        },
        'gpt-5.1': {
            inputUsdPerMTok: 1.25,
            outputUsdPerMTok: 10,
        },

        /*
         * GPT-5
         */
        'gpt-5-pro': {
            inputUsdPerMTok: 15,
            outputUsdPerMTok: 120,
        },
        'gpt-5-chat-latest': {
            inputUsdPerMTok: 1.25,
            outputUsdPerMTok: 10,
        },
        'gpt-5-codex': {
            inputUsdPerMTok: 1.25,
            outputUsdPerMTok: 10,
        },
        'gpt-5-mini': {
            inputUsdPerMTok: 0.25,
            outputUsdPerMTok: 2,
        },
        'gpt-5-nano': {
            inputUsdPerMTok: 0.05,
            outputUsdPerMTok: 0.4,
        },
        'gpt-5': {
            inputUsdPerMTok: 1.25,
            outputUsdPerMTok: 10,
        },

        /*
         * Alias del modelo ChatGPT actual expuesto por la API.
         */
        'chat-latest': {
            inputUsdPerMTok: 5,
            outputUsdPerMTok: 30,
        },

        /*
         * GPT-4.1
         *
         * Los grupos "long-context" de la página de límites tienen
         * límites independientes, pero conservan estas tarifas.
         */
        'gpt-4.1-mini-long-context': {
            inputUsdPerMTok: 0.4,
            outputUsdPerMTok: 1.6,
        },
        'gpt-4.1-nano-long-context': {
            inputUsdPerMTok: 0.1,
            outputUsdPerMTok: 0.4,
        },
        'gpt-4.1-long-context': {
            inputUsdPerMTok: 2,
            outputUsdPerMTok: 8,
        },
        'gpt-4.1-mini': {
            inputUsdPerMTok: 0.4,
            outputUsdPerMTok: 1.6,
        },
        'gpt-4.1-nano': {
            inputUsdPerMTok: 0.1,
            outputUsdPerMTok: 0.4,
        },
        'gpt-4.1': {
            inputUsdPerMTok: 2,
            outputUsdPerMTok: 8,
        },

        /*
         * GPT-4o
         */
        'gpt-4o-mini-search-preview': {
            inputUsdPerMTok: 0.15,
            outputUsdPerMTok: 0.6,
        },
        'gpt-4o-search-preview': {
            inputUsdPerMTok: 2.5,
            outputUsdPerMTok: 10,
        },
        'gpt-4o-mini': {
            inputUsdPerMTok: 0.15,
            outputUsdPerMTok: 0.6,
        },
        'gpt-4o': {
            inputUsdPerMTok: 2.5,
            outputUsdPerMTok: 10,
        },

        /*
         * Reasoning models
         */
        'o4-mini': {
            inputUsdPerMTok: 1.1,
            outputUsdPerMTok: 4.4,
        },
        'o3-mini': {
            inputUsdPerMTok: 1.1,
            outputUsdPerMTok: 4.4,
        },
        o3: {
            inputUsdPerMTok: 2,
            outputUsdPerMTok: 8,
        },
        o1: {
            inputUsdPerMTok: 15,
            outputUsdPerMTok: 60,
        },

        /*
         * Legacy
         */
        'gpt-3.5-turbo-16k': {
            inputUsdPerMTok: 3,
            outputUsdPerMTok: 4,
        },
        'gpt-3.5-turbo-instruct': {
            inputUsdPerMTok: 1.5,
            outputUsdPerMTok: 2,
        },
        'gpt-3.5-turbo': {
            inputUsdPerMTok: 0.5,
            outputUsdPerMTok: 1.5,
        },
        'babbage-002': {
            inputUsdPerMTok: 0.4,
            outputUsdPerMTok: 0.4,
        },
        'davinci-002': {
            inputUsdPerMTok: 2,
            outputUsdPerMTok: 2,
        },
    },
}

/**
 * Every model id the app knows a price for, across providers. The allowlist a
 * metric label is normalised against — the pricing table is the one place that
 * already enumerates "models we recognise", so labels and costs never drift.
 */
export const KNOWN_MODEL_IDS: readonly string[] = Object.values(PRICES).flatMap((table) => Object.keys(table))

@Injectable()
export class StaticModelPricing extends ModelPricing {
    priceFor(provider: AiProvider, model: string): ModelPrice | null {
        const table = PRICES[provider]

        const exact = table[model]
        if (exact) return exact

        // Date-suffixed or aliased ids (e.g. "claude-opus-4-8-20260528") fall back
        // to the longest known id they start with.
        const prefix = Object.keys(table)
            .filter((id) => model.startsWith(id))
            .sort((a, b) => b.length - a.length)[0]

        return prefix ? (table[prefix] ?? null) : null
    }
}
