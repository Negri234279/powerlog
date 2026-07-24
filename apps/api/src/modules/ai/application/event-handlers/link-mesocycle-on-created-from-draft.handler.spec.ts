import { beforeEach, describe, expect, it } from 'vitest'

import { FakeClock, InMemoryAiMesocycleDraftRepository } from '../../../../../tests/doubles/ai'
import { silentLogger } from '../../../../../tests/doubles/shared'
import { AiMesocycleDraftMother } from '../../../../../tests/mothers/ai'
import { MesocycleCreatedFromAiDraftIntegrationEvent } from '../../../../shared/integration-events/mesocycle-created-from-ai-draft.integration-event'
import { LinkMesocycleOnCreatedFromDraft } from './link-mesocycle-on-created-from-draft.handler'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_USER_ID = '99999999-9999-4999-8999-999999999999'
const MESOCYCLE_ID = '44444444-4444-4444-8444-444444444444'

describe('LinkMesocycleOnCreatedFromDraft', () => {
    let drafts: InMemoryAiMesocycleDraftRepository
    let handler: LinkMesocycleOnCreatedFromDraft

    beforeEach(() => {
        drafts = new InMemoryAiMesocycleDraftRepository()
        handler = new LinkMesocycleOnCreatedFromDraft(drafts, new FakeClock(), silentLogger())
    })

    it('should_record_the_block_the_draft_became', async () => {
        const draft = AiMesocycleDraftMother.open({ id: 'draft-1', userId: USER_ID })
        drafts.seed(draft)

        await handler.handle(new MesocycleCreatedFromAiDraftIntegrationEvent(USER_ID, 'draft-1', MESOCYCLE_ID))

        expect((await drafts.findById('draft-1'))?.mesocycleId).toBe(MESOCYCLE_ID)
    })

    it('should_keep_the_first_block_when_a_draft_is_built_twice', async () => {
        drafts.seed(AiMesocycleDraftMother.open({ id: 'draft-1', userId: USER_ID }))
        await handler.handle(new MesocycleCreatedFromAiDraftIntegrationEvent(USER_ID, 'draft-1', MESOCYCLE_ID))

        await handler.handle(new MesocycleCreatedFromAiDraftIntegrationEvent(USER_ID, 'draft-1', 'second-block'))

        // The link is a record of what happened, not a pointer to the latest thing.
        expect((await drafts.findById('draft-1'))?.mesocycleId).toBe(MESOCYCLE_ID)
    })

    it('should_ignore_a_draft_that_is_not_the_creator_s', async () => {
        drafts.seed(AiMesocycleDraftMother.open({ id: 'draft-1', userId: USER_ID }))

        // The draft id arrives from the client, so it is a claim, not a fact.
        await handler.handle(new MesocycleCreatedFromAiDraftIntegrationEvent(OTHER_USER_ID, 'draft-1', MESOCYCLE_ID))

        expect((await drafts.findById('draft-1'))?.mesocycleId).toBeNull()
    })

    it('should_not_fail_a_creation_that_already_succeeded_when_the_draft_is_gone', async () => {
        const event = new MesocycleCreatedFromAiDraftIntegrationEvent(USER_ID, 'missing', MESOCYCLE_ID)

        await expect(handler.handle(event)).resolves.toBeUndefined()
    })
})
