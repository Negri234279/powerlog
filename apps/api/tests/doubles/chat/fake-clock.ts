import { Clock } from '../../../src/modules/chat/application/ports/clock.port'

/** Deterministic clock for the chat context. Tests control "now". */
export class FakeClock extends Clock {
    constructor(private current: Date = new Date('2026-01-01T00:00:00.000Z')) {
        super()
    }

    now(): Date {
        return new Date(this.current)
    }

    set(date: Date): void {
        this.current = new Date(date)
    }

    /** Advance the clock by `ms` and return the new "now". */
    advance(ms: number): Date {
        this.current = new Date(this.current.getTime() + ms)
        return this.now()
    }
}
