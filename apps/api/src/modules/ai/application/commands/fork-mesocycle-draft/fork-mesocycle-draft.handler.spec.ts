import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    FakeIdGenerator,
    FakeSecretCipher,
    InMemoryAiMesocycleDraftRepository,
    InMemoryAiProviderConfigRepository,
    RecordingAiGenerationMetrics,
    StubLlmProviderClient,
    stubRegistry,
} from '../../../../../../tests/doubles/ai'
import { FakeEntitlements, RecordingEventBus, silentLogger } from '../../../../../../tests/doubles/shared'
import { AiMesocycleDraftMother, AiProviderConfigMother } from '../../../../../../tests/mothers/ai'
import { FeatureNotInPlanError } from '../../../../../shared/contracts/entitlements'
import { AiMesocycleDraftNotFoundError } from '../../../domain/errors/ai-mesocycle.errors'
import { AiConversation } from '../../services/ai-conversation.service'
import { AiProviderResolver } from '../../services/ai-provider-resolver.service'
import { MesocycleDesigner } from '../../services/mesocycle-designer.service'
import { ForkMesocycleDraftCommand } from './fork-mesocycle-draft.command'
import { ForkMesocycleDraftHandler } from './fork-mesocycle-draft.handler'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_USER_ID = '99999999-9999-4999-8999-999999999999'
const ATHLETE_ID = '33333333-3333-4333-8333-333333333333'
const NOW = new Date('2026-03-01T00:00:00.000Z')

describe('ForkMesocycleDraftHandler', () => {
    let drafts: InMemoryAiMesocycleDraftRepository
    let configs: InMemoryAiProviderConfigRepository
    let openai: StubLlmProviderClient
    let entitlements: FakeEntitlements

    const buildHandler = () =>
        new ForkMesocycleDraftHandler(
            drafts,
            new MesocycleDesigner(
                new AiProviderResolver(configs),
                new AiConversation(
                    new FakeSecretCipher(),
                    stubRegistry(openai),
                    silentLogger(),
                    new RecordingEventBus().asEventBus(),
                ),
                new RecordingAiGenerationMetrics(),
            ),
            entitlements,
            new FakeClock(),
            new FakeIdGenerator('fork'),
            silentLogger(),
        )

    /** A resolved block design, the thing a fork continues. */
    const anAcceptedDraft = (overrides: { athleteId?: string } = {}) => {
        const draft = AiMesocycleDraftMother.open({ id: 'source', userId: USER_ID, ...overrides })
        draft.accept(NOW)
        drafts.seed(draft)

        return draft
    }

    beforeEach(() => {
        drafts = new InMemoryAiMesocycleDraftRepository()
        configs = new InMemoryAiProviderConfigRepository()
        configs.seed(AiProviderConfigMother.openai({ userId: USER_ID, model: 'gpt-5', isDefault: true }))
        openai = new StubLlmProviderClient('openai')
        entitlements = new FakeEntitlements()
    })

    it('should_open_a_new_draft_carrying_the_week_and_the_request_it_was_designed_for', async () => {
        const source = anAcceptedDraft()
        const command = new ForkMesocycleDraftCommand(USER_ID, source.id)

        const view = await buildHandler().execute(command)

        expect(view.status).toBe('open')
        expect(view.id).not.toBe(source.id)
        expect(view.weeks).toBe(source.weeks)
        expect(view.trainingDays).toEqual([...source.trainingDays])
        expect(view.name).toBe(source.proposal.name)
        expect(view.parentDraftId).toBe(source.id)
    })

    it('should_start_a_fresh_thread_rather_than_copying_an_exhausted_one', async () => {
        const source = anAcceptedDraft()
        const command = new ForkMesocycleDraftCommand(USER_ID, source.id)

        const view = await buildHandler().execute(command)

        // Threads are capped, so copying a long conversation would hand back a fork
        // with no room left to say anything.
        expect(view.messages).toHaveLength(1)
        expect(view.messages[0]?.role).toBe('assistant')
    })

    it('should_leave_the_conversation_it_continues_untouched', async () => {
        const source = anAcceptedDraft()
        const command = new ForkMesocycleDraftCommand(USER_ID, source.id)

        await buildHandler().execute(command)

        expect((await drafts.findById(source.id))?.status.value).toBe('accepted')
    })

    it('should_not_call_the_model', async () => {
        const source = anAcceptedDraft()
        const command = new ForkMesocycleDraftCommand(USER_ID, source.id)

        await buildHandler().execute(command)

        expect(openai.completeCalls).toHaveLength(0)
    })

    it('should_supersede_only_the_open_draft_of_the_same_trainee', async () => {
        const source = anAcceptedDraft({ athleteId: ATHLETE_ID })
        drafts.seed(AiMesocycleDraftMother.open({ id: 'for-athlete', userId: USER_ID, athleteId: ATHLETE_ID }))
        const forSelf = AiMesocycleDraftMother.open({ id: 'own', userId: USER_ID })
        drafts.seed(forSelf)
        const command = new ForkMesocycleDraftCommand(USER_ID, source.id)

        await buildHandler().execute(command)

        expect((await drafts.findById('for-athlete'))?.status.value).toBe('discarded')
        // A coach designing for Ana must not lose the block they have open for
        // themselves.
        expect((await drafts.findById('own'))?.status.value).toBe('open')
    })

    it('should_refuse_to_continue_someone_else_s_conversation', async () => {
        const source = anAcceptedDraft()
        const command = new ForkMesocycleDraftCommand(OTHER_USER_ID, source.id)

        await expect(buildHandler().execute(command)).rejects.toBeInstanceOf(AiMesocycleDraftNotFoundError)
    })

    it('should_charge_a_block_designed_for_an_athlete_to_the_coach_plan', async () => {
        const source = anAcceptedDraft({ athleteId: ATHLETE_ID })
        entitlements.onCoach({ ai: false })
        const command = new ForkMesocycleDraftCommand(USER_ID, source.id)

        await expect(buildHandler().execute(command)).rejects.toBeInstanceOf(FeatureNotInPlanError)
    })

    it('should_charge_your_own_block_to_your_athlete_plan', async () => {
        const source = anAcceptedDraft()
        entitlements.onAthlete({ ai: false })
        const command = new ForkMesocycleDraftCommand(USER_ID, source.id)

        await expect(buildHandler().execute(command)).rejects.toBeInstanceOf(FeatureNotInPlanError)
    })
})
