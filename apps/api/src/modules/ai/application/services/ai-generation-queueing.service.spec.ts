import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    FakeIdGenerator,
    InMemoryAiGenerationRepository,
    RecordingAiGenerationMetrics,
    RecordingAiGenerationQueue,
} from '../../../../../tests/doubles/ai'
import { silentLogger } from '../../../../../tests/doubles/shared'
import { sessionPlanRequest } from '../../../../../tests/mothers/ai'
import { AiGenerationQueueUnavailableError } from '../../domain/errors/ai-generation.errors'
import { AiGenerationQueueing } from './ai-generation-queueing.service'

const USER_ID = '11111111-1111-4111-8111-111111111111'

let generations: InMemoryAiGenerationRepository
let queue: RecordingAiGenerationQueue
let metrics: RecordingAiGenerationMetrics
let queueing: AiGenerationQueueing

beforeEach(() => {
    generations = new InMemoryAiGenerationRepository()
    queue = new RecordingAiGenerationQueue()
    metrics = new RecordingAiGenerationMetrics()
    queueing = new AiGenerationQueueing(
        generations,
        queue,
        metrics,
        new FakeClock(),
        new FakeIdGenerator('gen'),
        silentLogger(),
    )
})

describe('AiGenerationQueueing', () => {
    it('records the job and hands its id to the queue', async () => {
        const view = await queueing.enqueue(USER_ID, 'session_plan', sessionPlanRequest())

        expect(view.status).toBe('queued')
        expect(view.draftId).toBeNull()
        expect(queue.enqueued).toEqual([view.id])
        expect(metrics.queued).toEqual(['session_plan'])
    })

    it('hands back the job already in flight instead of paying for a second one', async () => {
        const request = sessionPlanRequest()
        const first = await queueing.enqueue(USER_ID, 'session_plan', request)

        const second = await queueing.enqueue(USER_ID, 'session_plan', request)

        expect(second.id).toBe(first.id)
        expect(generations.all()).toHaveLength(1)
        expect(queue.enqueued).toEqual([first.id])
    })

    it('lets the same session be asked for again once the first job settled', async () => {
        const request = sessionPlanRequest()
        const first = await queueing.enqueue(USER_ID, 'session_plan', request)
        const stored = await generations.findById(first.id)
        stored?.fail('UNKNOWN', new Date())
        await generations.save(stored!)

        const second = await queueing.enqueue(USER_ID, 'session_plan', request)

        expect(second.id).not.toBe(first.id)
        expect(second.status).toBe('queued')
    })

    it('fails the job it could not queue, so the scope is not held by a ghost', async () => {
        queue.breakIt()

        await expect(queueing.enqueue(USER_ID, 'session_plan', sessionPlanRequest())).rejects.toThrow(
            AiGenerationQueueUnavailableError,
        )

        const [stored] = generations.all()
        expect(stored?.status.value).toBe('failed')
        expect(stored?.failureCode).toBe('AI_GENERATION_QUEUE_UNAVAILABLE')
        expect(metrics.queued).toEqual([])
    })

    it('lets the next attempt through after a queue failure', async () => {
        const request = sessionPlanRequest()
        queue.breakIt()
        await expect(queueing.enqueue(USER_ID, 'session_plan', request)).rejects.toThrow()

        queue = new RecordingAiGenerationQueue()
        queueing = new AiGenerationQueueing(
            generations,
            queue,
            metrics,
            new FakeClock(),
            new FakeIdGenerator('retry'),
            silentLogger(),
        )

        const view = await queueing.enqueue(USER_ID, 'session_plan', request)
        expect(view.status).toBe('queued')
    })
})
