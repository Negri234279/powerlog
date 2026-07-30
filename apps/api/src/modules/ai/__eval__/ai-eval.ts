// A manual CLI diagnostic (not app code): console output is the point, and it
// runs outside the DI container. See __eval__/README.md.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import type { AiProvider, LlmProviderClient, LlmSystemBlock } from '../../../ai/llm-provider.port'
import { AnthropicProviderClient } from '../../../ai/anthropic.provider-client'
import { OpenAiProviderClient } from '../../../ai/openai.provider-client'
import type {
    AthleteStrength,
    CatalogExercise,
    MesocycleDesignContext,
} from '../../../shared/contracts/mesocycle-design-context'
import {
    MESOCYCLE_SYSTEM_PROMPT,
    buildMesocycleCatalogBlock,
    buildMesocycleUserPrompt,
} from '../application/services/mesocycle-prompt.service'
import { collectMesocycleViolations } from './collect-violations'

/**
 * `pnpm ai:eval` — the golden-set runner (IA.1/IA.2). Sends each saved context in
 * `__fixtures__/golden/` to a real model and reports whether the answer is
 * *defensible* (survives the same validation the designer applies) and which
 * rules trip. It measures defensibility, not quality — that is all that can be
 * automated without a coach.
 *
 * Deliberately OUTSIDE the test suite and CI: it spends the caller's own API key
 * and its result is non-deterministic. Run it by hand from `apps/api`, with the
 * provider key in the environment:
 *
 *   ANTHROPIC_API_KEY=sk-... pnpm --filter @powerlog/api ai:eval
 *
 * The deterministic half — the validator itself — is covered by
 * `collect-violations.spec.ts`, which does run in CI.
 */

interface Fixture {
    name: string
    provider: AiProvider
    model: string
    request: { weeks: number; trainingDays: number[]; goal: string | null; prompt: string | null }
    strength: (Omit<AthleteStrength, 'lastTrainedAt'> & { lastTrainedAt: string })[]
}

const GOLDEN_DIR = join(process.cwd(), 'src/modules/ai/__fixtures__/golden')
const MAX_TOKENS = 16_000

function loadCatalog(): CatalogExercise[] {
    return JSON.parse(readFileSync(join(GOLDEN_DIR, '_catalog.json'), 'utf8')) as CatalogExercise[]
}

function loadFixtures(): Fixture[] {
    return readdirSync(GOLDEN_DIR)
        .filter((file) => file.endsWith('.json') && !file.startsWith('_'))
        .sort()
        .map((file) => JSON.parse(readFileSync(join(GOLDEN_DIR, file), 'utf8')) as Fixture)
}

function clientFor(provider: AiProvider): LlmProviderClient {
    return provider === 'anthropic' ? new AnthropicProviderClient() : new OpenAiProviderClient()
}

function apiKeyFor(provider: AiProvider): string {
    const variable = provider === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'
    // eslint-disable-next-line no-process-env -- a standalone CLI, not app code under DI.
    const key = process.env[variable]
    if (!key) throw new Error(`Set ${variable} to run the eval against ${provider}.`)

    return key
}

function tally(map: Map<string, number>, key: string): void {
    map.set(key, (map.get(key) ?? 0) + 1)
}

async function main(): Promise<void> {
    const catalog = loadCatalog()
    const fixtures = loadFixtures()
    const rejections = new Map<string, number>()
    const warnings = new Map<string, number>()
    let passed = 0

    for (const fixture of fixtures) {
        const strength: AthleteStrength[] = fixture.strength.map((lift) => ({
            ...lift,
            lastTrainedAt: new Date(lift.lastTrainedAt),
        }))
        const context: MesocycleDesignContext = { catalog, strength }
        const { request } = fixture

        const system: LlmSystemBlock[] = [
            { text: MESOCYCLE_SYSTEM_PROMPT },
            { text: buildMesocycleCatalogBlock(catalog), cache: true },
        ]

        let text: string
        try {
            const completion = await clientFor(fixture.provider).complete({
                apiKey: apiKeyFor(fixture.provider),
                model: fixture.model,
                system,
                messages: [{ role: 'user', content: buildMesocycleUserPrompt(context, request) }],
                maxTokens: MAX_TOKENS,
            })
            text = completion.text
        } catch (error) {
            console.log(`✗ ${fixture.name}: provider error — ${(error as Error).message}`)
            continue
        }

        const result = collectMesocycleViolations(text, {
            catalog,
            strength,
            trainingDays: request.trainingDays,
            weeks: request.weeks,
            goal: request.goal,
        })

        if (result.outcome === 'pass') {
            passed++
            const note = result.warnings.length > 0 ? ` (warnings: ${result.warnings.join(', ')})` : ''
            console.log(`✓ ${fixture.name}${note}`)
            for (const warning of result.warnings) tally(warnings, warning)
        } else {
            console.log(`✗ ${fixture.name}: ${result.reason ?? 'rejected'}`)
            tally(rejections, result.reason ?? 'unknown')
        }
    }

    console.log(`\n${passed}/${fixtures.length} defensible`)
    report('Rejections by reason', rejections)
    report('Warnings by rule', warnings)
}

function report(title: string, counts: Map<string, number>): void {
    if (counts.size === 0) return

    console.log(`\n${title}:`)
    for (const [key, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`  ${count}×  ${key}`)
    }
}

main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
})
