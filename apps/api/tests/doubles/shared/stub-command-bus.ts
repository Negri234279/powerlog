import type { CommandBus } from '@nestjs/cqrs'

/**
 * Stands in for the CommandBus where a handler's job is to dispatch other
 * commands rather than to do the work itself. It records what was dispatched and
 * answers with whatever the test set up — including a failure, which is how a
 * caller's error handling gets exercised without mocking the handler behind it.
 */
export class StubCommandBus {
    readonly executed: unknown[] = []
    private result: unknown = undefined
    private failure: Error | null = null

    /** Answer every dispatch with this. */
    returns(result: unknown): this {
        this.result = result
        this.failure = null

        return this
    }

    /** Fail every dispatch with this. */
    fails(error: Error): this {
        this.failure = error

        return this
    }

    async execute(command: unknown): Promise<unknown> {
        this.executed.push(command)
        if (this.failure) throw this.failure

        return this.result
    }

    /** The first dispatched command of the given type, or undefined. */
    firstOf<T>(type: new (...args: never[]) => T): T | undefined {
        return this.executed.find((command): command is T => command instanceof type)
    }

    /** Cast to the Nest CommandBus shape for constructor injection in tests. */
    asCommandBus(): CommandBus {
        return this as unknown as CommandBus
    }
}
