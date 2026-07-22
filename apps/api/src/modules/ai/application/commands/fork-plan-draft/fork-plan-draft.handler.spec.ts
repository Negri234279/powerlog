import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    FakeIdGenerator,
    FakeSecretCipher,
    InMemoryAiPlanDraftRepository,
    InMemoryAiProviderConfigRepository,
    StubLlmProviderClient,
    StubSessionPlanContextReader,
    stubRegistry,
} from '../../../../../../tests/doubles/ai'
import { FakeEntitlements, RecordingEventBus, silentLogger } from '../../../../../../tests/doubles/shared'
import { AiPlanDraftMother, AiProviderConfigMother, SessionPlanContextMother } from '../../../../../../tests/mothers/ai'
import { FeatureNotInPlanError } from '../../../../../shared/contracts/entitlements'
import type { SessionPlanContext } from '../../../../../shared/contracts/session-plan-context'
import { AiPlanDraftNotFoundError, SessionNotProgrammableError } from '../../../domain/errors/ai-plan.errors'
import { AiConversation } from '../../services/ai-conversation.service'
import { AiProviderResolver } from '../../services/ai-provider-resolver.service'
import { SetPrescriber } from '../../services/set-prescriber.service'
import { ForkPlanDraftCommand } from './fork-plan-draft.command'
import { ForkPlanDraftHandler } from './fork-plan-draft.handler'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const SESSION_ID = 'session-1'

describe('ForkPlanDraftHandler', () => {
    let drafts: InMemoryAiPlanDraftRepository
    let configs: InMemoryAiProviderConfigRepository
    let openai: StubLlmProviderClient
    let entitlements: FakeEntitlements

    const buildHandler = (context: SessionPlanContext | null = SessionPlanContextMother.create()) =>
        new ForkPlanDraftHandler(
            drafts,
            new StubSessionPlanContextReader(context),
            new SetPrescriber(
                new AiProviderResolver(configs),
                new AiConversation(
                    new FakeSecretCipher(),
                    stubRegistry(openai),
                    silentLogger(),
                    new RecordingEventBus().asEventBus(),
                ),
            ),
            entitlements,
            new FakeClock(),
            new FakeIdGenerator('fork'),
            silentLogger(),
        )

    /** A resolved conversation, the thing a fork continues. */
    const anAcceptedDraft = () => {
        const draft = AiPlanDraftMother.open({
            id: 'source',
            userId: USER_ID,
            sessionId: SESSION_ID,
            request: 'more volume on bench',
        })
        draft.accept(new Date('2026-01-01T00:00:00.000Z'))
        drafts.seed(draft)

        return draft
    }

    beforeEach(() => {
        drafts = new InMemoryAiPlanDraftRepository()
        configs = new InMemoryAiProviderConfigRepository()
        configs.seed(AiProviderConfigMother.openai({ userId: USER_ID, model: 'gpt-5', isDefault: true }))
        openai = new StubLlmProviderClient('openai')
        entitlements = new FakeEntitlements()
    })

    it('should_open_a_new_draft_carrying_the_resolved_one_s_proposal', async () => {
        const source = anAcceptedDraft()
        const command = new ForkPlanDraftCommand(USER_ID, source.id)

        const view = await buildHandler().execute(command)

        expect(view.status).toBe('open')
        expect(view.id).not.toBe(source.id)
        expect(view.sessionId).toBe(SESSION_ID)
        expect(view.sets).toEqual(source.sets.map((set) => ({ ...set })))
    })

    it('should_leave_the_conversation_it_continues_untouched', async () => {
        const source = anAcceptedDraft()
        const command = new ForkPlanDraftCommand(USER_ID, source.id)

        await buildHandler().execute(command)

        // Accepted is terminal: the receipt of what was applied must not change.
        expect((await drafts.findById(source.id))?.status.value).toBe('accepted')
    })

    it('should_record_which_conversation_it_continues', async () => {
        const source = anAcceptedDraft()
        const command = new ForkPlanDraftCommand(USER_ID, source.id)

        const view = await buildHandler().execute(command)

        expect(view.parentDraftId).toBe(source.id)
    })

    it('should_start_a_fresh_thread_opened_by_the_reasoning_behind_the_carried_proposal', async () => {
        const source = anAcceptedDraft()
        const command = new ForkPlanDraftCommand(USER_ID, source.id)

        const view = await buildHandler().execute(command)

        // Not a copy of the old thread: one assistant turn explaining the proposal
        // the athlete is picking up, and room to say something new.
        expect(view.messages).toHaveLength(1)
        expect(view.messages[0]?.role).toBe('assistant')
        expect(view.messages[0]?.content).toBe('Held the top set and added a back-off.')
    })

    it('should_not_call_the_model', async () => {
        const source = anAcceptedDraft()
        const command = new ForkPlanDraftCommand(USER_ID, source.id)

        await buildHandler().execute(command)

        // Forking is free; the athlete pays only when they ask for a revision.
        expect(openai.completeCalls).toHaveLength(0)
    })

    it('should_supersede_the_session_s_open_draft', async () => {
        const source = anAcceptedDraft()
        drafts.seed(AiPlanDraftMother.open({ id: 'in-progress', userId: USER_ID, sessionId: SESSION_ID }))
        const command = new ForkPlanDraftCommand(USER_ID, source.id)

        const view = await buildHandler().execute(command)

        // A session holds one proposal at a time — the same rule generating obeys.
        // The superseded one stays readable in the history.
        expect((await drafts.findById('in-progress'))?.status.value).toBe('discarded')
        expect(await drafts.findOpenBySession(USER_ID, SESSION_ID)).toMatchObject({ id: view.id })
    })

    it('should_refuse_to_continue_someone_else_s_conversation', async () => {
        const source = anAcceptedDraft()
        const command = new ForkPlanDraftCommand('22222222-2222-4222-8222-222222222222', source.id)

        await expect(buildHandler().execute(command)).rejects.toBeInstanceOf(AiPlanDraftNotFoundError)
    })

    it('should_refuse_when_the_session_is_no_longer_programmable', async () => {
        const source = anAcceptedDraft()
        const command = new ForkPlanDraftCommand(USER_ID, source.id)

        // The session was trained or deleted since the conversation happened.
        await expect(buildHandler(null).execute(command)).rejects.toBeInstanceOf(SessionNotProgrammableError)
    })

    it('should_refuse_when_the_plan_no_longer_includes_ai', async () => {
        const source = anAcceptedDraft()
        entitlements.onAthlete({ ai: false })
        const command = new ForkPlanDraftCommand(USER_ID, source.id)

        // History outlives a downgrade, so this is reachable from a stale screen.
        await expect(buildHandler().execute(command)).rejects.toBeInstanceOf(FeatureNotInPlanError)
    })
})
