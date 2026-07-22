import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    InMemoryAiGenerationRepository,
    RecordingAiGenerationMetrics,
} from '../../../../../../tests/doubles/ai'
import { RecordingEventBus, silentLogger, StubCommandBus } from '../../../../../../tests/doubles/shared'
import { AiGenerationMother, mesocycleRequest, refinementRequest } from '../../../../../../tests/mothers/ai'
import { AiGenerationSettledIntegrationEvent } from '../../../../../shared/integration-events/ai-generation-settled.integration-event'
import { AiGenerationNotFoundError } from '../../../domain/errors/ai-generation.errors'
import { InvalidAiMesocycleResponseError } from '../../../domain/errors/ai-mesocycle.errors'
import { GenerateMesocycleDraftCommand } from '../generate-mesocycle-draft/generate-mesocycle-draft.command'
import { RefineMesocycleDraftCommand } from '../refine-mesocycle-draft/refine-mesocycle-draft.command'
import { RunAiGenerationCommand } from './run-ai-generation.command'
import { RunAiGenerationHandler } from './run-ai-generation.handler'

const DRAFT_ID = '22222222-2222-4222-8222-222222222222'
const QUEUED_AT = new Date('2026-01-01T00:00:00.000Z')
const SETTLED_AT = new Date('2026-01-01T00:00:22.000Z')

let generations: InMemoryAiGenerationRepository
let commandBus: StubCommandBus
let events: RecordingEventBus
let metrics: RecordingAiGenerationMetrics
let clock: FakeClock
let handler: RunAiGenerationHandler

beforeEach(() => {
    generations = new InMemoryAiGenerationRepository()
    commandBus = new StubCommandBus().returns({ id: DRAFT_ID })
    events = new RecordingEventBus()
    metrics = new RecordingAiGenerationMetrics()
    clock = new FakeClock(SETTLED_AT)
    handler = new RunAiGenerationHandler(
        generations,
        commandBus.asCommandBus(),
        events.asEventBus(),
        metrics,
        clock,
        silentLogger(),
    )
})

describe('RunAiGenerationHandler', () => {
    it('runs the job it was given and points the generation at the draft', async () => {
        const generation = AiGenerationMother.mesocycle(mesocycleRequest({ weeks: 6 }), { now: QUEUED_AT })
        generations.seed(generation)

        await handler.execute(new RunAiGenerationCommand(generation.id))

        const settled = await generations.findById(generation.id)
        expect(settled?.status.value).toBe('succeeded')
        expect(settled?.draftId).toBe(DRAFT_ID)
        expect(commandBus.firstOf(GenerateMesocycleDraftCommand)?.weeks).toBe(6)
    })

    it('dispatches a refinement to the draft it revises', async () => {
        const generation = AiGenerationMother.mesocycleRefinement(
            refinementRequest({ draftId: DRAFT_ID, message: 'swap the leg press' }),
            { now: QUEUED_AT },
        )
        generations.seed(generation)

        await handler.execute(new RunAiGenerationCommand(generation.id))

        const dispatched = commandBus.firstOf(RefineMesocycleDraftCommand)
        expect(dispatched?.draftId).toBe(DRAFT_ID)
        expect(dispatched?.message).toBe('swap the leg press')
    })

    it('records a failure as an outcome rather than letting it escape', async () => {
        const generation = AiGenerationMother.mesocycle(mesocycleRequest(), { now: QUEUED_AT })
        generations.seed(generation)
        commandBus.fails(new InvalidAiMesocycleResponseError())

        await expect(handler.execute(new RunAiGenerationCommand(generation.id))).resolves.toBeUndefined()

        const settled = await generations.findById(generation.id)
        expect(settled?.status.value).toBe('failed')
        expect(settled?.failureCode).toBe('INVALID_AI_MESOCYCLE_RESPONSE')
    })

    it('never shows an unrecognised failure’s words, only that it is unknown', async () => {
        const generation = AiGenerationMother.mesocycle(mesocycleRequest(), { now: QUEUED_AT })
        generations.seed(generation)
        commandBus.fails(new Error('rate limited by provider: key sk-abc123'))

        await handler.execute(new RunAiGenerationCommand(generation.id))

        expect((await generations.findById(generation.id))?.failureCode).toBe('UNKNOWN')
    })

    it('announces the outcome either way, so the browser stops waiting', async () => {
        const generation = AiGenerationMother.mesocycle(mesocycleRequest(), { now: QUEUED_AT })
        generations.seed(generation)
        commandBus.fails(new InvalidAiMesocycleResponseError())

        await handler.execute(new RunAiGenerationCommand(generation.id))

        const event = events.firstOf(AiGenerationSettledIntegrationEvent)
        expect(event?.status).toBe('failed')
        expect(event?.draftId).toBeNull()
        expect(event?.userId).toBe(generation.userId)
    })

    it('drops a duplicated job instead of calling the provider twice', async () => {
        const generation = AiGenerationMother.mesocycle(mesocycleRequest(), { now: QUEUED_AT })
        generation.start(QUEUED_AT)
        generations.seed(generation)

        await handler.execute(new RunAiGenerationCommand(generation.id))

        expect(commandBus.executed).toHaveLength(0)
        expect(events.published).toHaveLength(0)
    })

    it('measures how long the athlete actually waited, queue time included', async () => {
        const generation = AiGenerationMother.mesocycle(mesocycleRequest(), { now: QUEUED_AT })
        generations.seed(generation)

        await handler.execute(new RunAiGenerationCommand(generation.id))

        expect(metrics.settled).toEqual([{ kind: 'mesocycle', status: 'succeeded', durationSeconds: 22 }])
    })

    it('refuses a generation that does not exist', async () => {
        await expect(handler.execute(new RunAiGenerationCommand(DRAFT_ID))).rejects.toThrow(AiGenerationNotFoundError)
    })
})
