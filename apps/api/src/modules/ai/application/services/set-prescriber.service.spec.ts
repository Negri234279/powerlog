import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeSecretCipher,
    InMemoryAiProviderConfigRepository,
    StubLlmProviderClient,
    stubRegistry,
} from '../../../../../tests/doubles/ai'
import { RecordingEventBus, silentLogger } from '../../../../../tests/doubles/shared'
import { AiProviderConfigMother, SessionPlanContextMother } from '../../../../../tests/mothers/ai'
import {
    AiModelNotSelectedError,
    InvalidAiPlanResponseError,
    NoDefaultAiProviderError,
} from '../../domain/errors/ai-plan.errors'
import { AiConversation } from './ai-conversation.service'
import { AiProviderResolver } from './ai-provider-resolver.service'
import { SetPrescriber } from './set-prescriber.service'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const RAW_KEY = 'sk-stored-0123456789abcd'

const validPlan = JSON.stringify({
    rationale: 'Progressed the top set.',
    exercises: [
        {
            entryId: 'entry-1',
            sets: [
                { weightKg: 102.5, reps: 5, rpe: 8, rir: null, note: null },
                { weightKg: 90, reps: 8, rpe: null, rir: 2, note: null },
                { weightKg: 90, reps: 8, rpe: null, rir: 2, note: null },
            ],
        },
    ],
})

describe('SetPrescriber', () => {
    let configs: InMemoryAiProviderConfigRepository
    let openai: StubLlmProviderClient

    const buildPrescriber = () =>
        new SetPrescriber(
            new AiProviderResolver(configs),
            new AiConversation(
                new FakeSecretCipher(),
                stubRegistry(openai),
                silentLogger(),
                new RecordingEventBus().asEventBus(),
            ),
        )

    const configuredDefault = () =>
        AiProviderConfigMother.openai({ userId: USER_ID, rawKey: RAW_KEY, model: 'gpt-5', isDefault: true })

    beforeEach(() => {
        configs = new InMemoryAiProviderConfigRepository()
        openai = new StubLlmProviderClient('openai')
    })

    describe('resolveConfig', () => {
        it('picks the enabled default provider', async () => {
            configs.seed(configuredDefault())

            const config = await buildPrescriber().resolveConfig(USER_ID)

            expect(config.provider.value).toBe('openai')
        })

        it('fails when nothing is configured', async () => {
            await expect(buildPrescriber().resolveConfig(USER_ID)).rejects.toThrow(NoDefaultAiProviderError)
        })

        it('fails when the default provider is paused', async () => {
            const config = configuredDefault()
            config.setEnabled(false, new Date())
            configs.seed(config)

            await expect(buildPrescriber().resolveConfig(USER_ID)).rejects.toThrow(NoDefaultAiProviderError)
        })

        it('fails when no provider is marked as the default', async () => {
            configs.seed(AiProviderConfigMother.openai({ userId: USER_ID, model: 'gpt-5' }))

            await expect(buildPrescriber().resolveConfig(USER_ID)).rejects.toThrow(NoDefaultAiProviderError)
        })

        it('fails when the default provider has no model selected', async () => {
            configs.seed(AiProviderConfigMother.openai({ userId: USER_ID, isDefault: true }))

            await expect(buildPrescriber().resolveConfig(USER_ID)).rejects.toThrow(AiModelNotSelectedError)
        })
    })

    describe('prescribe', () => {
        it('returns the parsed plan and calls the provider once', async () => {
            openai.willAnswer(validPlan)
            const prescriber = buildPrescriber()

            const plan = await prescriber.prescribe(configuredDefault(), SessionPlanContextMother.create())

            // Three sets proposed for an exercise that only had two: the model
            // owns the set count now.
            expect(plan.sets).toHaveLength(3)
            expect(openai.completeCalls).toHaveLength(1)
        })

        it('sends the decrypted key and the chosen model to the provider', async () => {
            openai.willAnswer(validPlan)

            await buildPrescriber().prescribe(configuredDefault(), SessionPlanContextMother.create())

            expect(openai.completeCalls[0]?.apiKey).toBe(RAW_KEY)
            expect(openai.completeCalls[0]?.model).toBe('gpt-5')
        })

        it('retries once, showing the model what was wrong with its answer', async () => {
            openai.willAnswer('I cannot do that.', validPlan)

            const plan = await buildPrescriber().prescribe(configuredDefault(), SessionPlanContextMother.create())

            expect(plan.sets).toHaveLength(3)
            expect(openai.completeCalls).toHaveLength(2)
            // The retry replays the bad answer and the reason it was rejected.
            const retryMessages = openai.completeCalls[1]!.messages
            expect(retryMessages.at(-2)).toMatchObject({ role: 'assistant', content: 'I cannot do that.' })
            expect(retryMessages.at(-1)?.content).toContain('rejected')
        })

        it('gives up after the retry rather than burning the user’s quota', async () => {
            openai.willAnswer('nonsense', 'still nonsense')

            await expect(
                buildPrescriber().prescribe(configuredDefault(), SessionPlanContextMother.create()),
            ).rejects.toThrow(InvalidAiPlanResponseError)
            expect(openai.completeCalls).toHaveLength(2)
        })

        it('never echoes the model’s bad answer back to the client', async () => {
            openai.willAnswer('secret rambling', 'more rambling')

            await expect(
                buildPrescriber().prescribe(configuredDefault(), SessionPlanContextMother.create()),
            ).rejects.toThrow(expect.objectContaining({ message: expect.not.stringContaining('rambling') }))
        })

        it('replays the refinement thread to the model', async () => {
            openai.willAnswer(validPlan)
            const thread = [{ role: 'user' as const, content: 'less volume' }]

            await buildPrescriber().prescribe(configuredDefault(), SessionPlanContextMother.create(), { thread })

            expect(openai.completeCalls[0]?.messages.at(-1)).toMatchObject({ content: 'less volume' })
        })

        it('passes the athlete’s extra info to the model, outranking the history', async () => {
            openai.willAnswer(validPlan)

            await buildPrescriber().prescribe(configuredDefault(), SessionPlanContextMother.create(), {
                extraInfo: 'shoulder is sore',
            })

            const prompt = openai.completeCalls[0]!.messages[0]!.content
            expect(prompt).toContain('shoulder is sore')
            expect(prompt).toContain('outranks the history')
        })

        it('tells the model when only one exercise is being programmed', async () => {
            openai.willAnswer(validPlan)

            await buildPrescriber().prescribe(configuredDefault(), SessionPlanContextMother.create())

            // The mother's context holds a single exercise.
            expect(openai.completeCalls[0]!.messages[0]!.content).toContain(
                "Program today's working sets for this one exercise",
            )
        })
    })
})
