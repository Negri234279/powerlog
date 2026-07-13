import { Clock } from '../../../src/modules/billing/application/ports/clock.port'

/** Deterministic clock for the billing context. Tests control "now". */
export class FakeClock extends Clock {
    constructor(private current: Date = new Date('2026-07-01T00:00:00.000Z')) {
        super()
    }

    now(): Date {
        return new Date(this.current)
    }

    set(date: Date): void {
        this.current = new Date(date)
    }
}
