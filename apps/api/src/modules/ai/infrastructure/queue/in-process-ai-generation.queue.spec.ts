import { beforeEach, describe, expect, it } from 'vitest'

import { silentLogger, StubCommandBus } from '../../../../../tests/doubles/shared'
import { RunAiGenerationCommand } from '../../application/commands/run-ai-generation/run-ai-generation.command'
import { InProcessAiGenerationQueue } from './in-process-ai-generation.queue'

const GENERATION_ID = '11111111-1111-4111-8111-111111111111'

/** Let everything scheduled with `setImmediate` run. */
const flush = () => new Promise((resolve) => setImmediate(resolve))

let commandBus: StubCommandBus
let queue: InProcessAiGenerationQueue

beforeEach(() => {
    commandBus = new StubCommandBus()
    queue = new InProcessAiGenerationQueue(commandBus.asCommandBus(), silentLogger())
})

describe('InProcessAiGenerationQueue', () => {
    it('returns before the job runs, so the mutation never waits for the provider', async () => {
        await queue.enqueue(GENERATION_ID)

        expect(commandBus.executed).toHaveLength(0)
    })

    it('runs the job once the caller has gone', async () => {
        await queue.enqueue(GENERATION_ID)

        await flush()

        expect(commandBus.firstOf(RunAiGenerationCommand)?.generationId).toBe(GENERATION_ID)
    })

    it('swallows a failing job rather than taking the process down with it', async () => {
        commandBus.fails(new Error('the database went away'))

        await queue.enqueue(GENERATION_ID)

        await flush()

        // It was attempted and the rejection went nowhere: nothing is waiting on
        // that promise, so an unhandled one would take the process with it.
        expect(commandBus.executed).toHaveLength(1)
    })
})
