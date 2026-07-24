import { beforeEach, describe, expect, it } from 'vitest'

import { InvalidAiDraftCursorError } from '../../../domain/errors/ai-plan.errors'
import { InMemoryAiDraftHistoryReadModel } from '../../../../../../tests/doubles/ai'
import { AiDraftSummaryMother } from '../../../../../../tests/mothers/ai'
import { decodeAiDraftHistoryCursor } from './ai-draft-history-cursor'
import { ListAiDraftsHandler } from './list-ai-drafts.handler'
import { ListAiDraftsQuery } from './list-ai-drafts.query'

const USER_ID = 'user-1'

const at = (iso: string): Date => new Date(iso)

describe('ListAiDraftsHandler', () => {
    let history: InMemoryAiDraftHistoryReadModel
    let handler: ListAiDraftsHandler

    beforeEach(() => {
        history = new InMemoryAiDraftHistoryReadModel()
        handler = new ListAiDraftsHandler(history)
    })

    it('should_return_session_and_mesocycle_drafts_in_one_feed_newest_first', async () => {
        history.seed(
            AiDraftSummaryMother.session({ id: 'a', updatedAt: at('2026-01-01T00:00:00.000Z') }),
            AiDraftSummaryMother.mesocycle({ id: 'b', updatedAt: at('2026-03-01T00:00:00.000Z') }),
            AiDraftSummaryMother.session({ id: 'c', updatedAt: at('2026-02-01T00:00:00.000Z') }),
        )

        const page = await handler.execute(new ListAiDraftsQuery(USER_ID, 10))

        expect(page.items.map((item) => item.id)).toEqual(['b', 'c', 'a'])
        expect(page.hasNextPage).toBe(false)
        expect(page.nextCursor).toBeNull()
    })

    it('should_hand_back_a_cursor_that_resumes_exactly_where_the_page_ended', async () => {
        history.seed(
            AiDraftSummaryMother.session({ id: 'a', updatedAt: at('2026-01-03T00:00:00.000Z') }),
            AiDraftSummaryMother.session({ id: 'b', updatedAt: at('2026-01-02T00:00:00.000Z') }),
            AiDraftSummaryMother.session({ id: 'c', updatedAt: at('2026-01-01T00:00:00.000Z') }),
        )

        const first = await handler.execute(new ListAiDraftsQuery(USER_ID, 2))

        expect(first.items.map((item) => item.id)).toEqual(['a', 'b'])
        expect(first.hasNextPage).toBe(true)
        expect(first.nextCursor).not.toBeNull()

        const second = await handler.execute(
            new ListAiDraftsQuery(USER_ID, 2, null, null, null, null, first.nextCursor),
        )

        // No overlap and nothing skipped: the second page starts after 'b'.
        expect(second.items.map((item) => item.id)).toEqual(['c'])
        expect(second.hasNextPage).toBe(false)
        expect(second.nextCursor).toBeNull()
    })

    it('should_not_offer_a_cursor_on_the_last_page', async () => {
        history.seed(AiDraftSummaryMother.session({ id: 'a' }))

        const page = await handler.execute(new ListAiDraftsQuery(USER_ID, 10))

        expect(page.nextCursor).toBeNull()
    })

    it('should_keep_resolved_drafts_in_the_history', async () => {
        history.seed(
            AiDraftSummaryMother.session({ id: 'a', status: 'accepted', updatedAt: at('2026-01-02T00:00:00.000Z') }),
            AiDraftSummaryMother.session({ id: 'b', status: 'discarded', updatedAt: at('2026-01-01T00:00:00.000Z') }),
        )

        const page = await handler.execute(new ListAiDraftsQuery(USER_ID, 10))

        expect(page.items.map((item) => item.status)).toEqual(['accepted', 'discarded'])
    })

    it('should_narrow_the_feed_to_one_kind_when_asked', async () => {
        history.seed(AiDraftSummaryMother.session({ id: 'a' }), AiDraftSummaryMother.mesocycle({ id: 'b' }))

        const page = await handler.execute(new ListAiDraftsQuery(USER_ID, 10, 'mesocycle'))

        expect(page.items.map((item) => item.id)).toEqual(['b'])
    })

    it('should_separate_the_coachs_own_blocks_from_the_ones_designed_for_athletes', async () => {
        history.seed(
            AiDraftSummaryMother.mesocycle({ id: 'own', athleteId: null }),
            AiDraftSummaryMother.mesocycle({ id: 'for-athlete', athleteId: 'athlete-1' }),
        )

        const own = await handler.execute(new ListAiDraftsQuery(USER_ID, 10, null, null, null, 'self'))
        const forAthlete = await handler.execute(new ListAiDraftsQuery(USER_ID, 10, null, null, null, 'athlete-1'))

        expect(own.items.map((item) => item.id)).toEqual(['own'])
        expect(forAthlete.items.map((item) => item.id)).toEqual(['for-athlete'])
    })

    it('should_reject_a_cursor_that_did_not_come_from_us', async () => {
        const query = new ListAiDraftsQuery(USER_ID, 10, null, null, null, null, 'not-a-cursor')

        await expect(handler.execute(query)).rejects.toBeInstanceOf(InvalidAiDraftCursorError)
    })

    it('should_encode_the_cursor_as_an_opaque_token_that_round_trips', () => {
        const cursor = { updatedAt: at('2026-01-02T03:04:05.000Z'), id: 'draft-9' }

        const decoded = decodeAiDraftHistoryCursor(
            Buffer.from(`${cursor.updatedAt.toISOString()}|${cursor.id}`, 'utf8').toString('base64url'),
        )

        expect(decoded).toEqual(cursor)
    })
})
