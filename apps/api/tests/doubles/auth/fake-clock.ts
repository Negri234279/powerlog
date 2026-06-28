import { Clock } from '../../../src/modules/auth/application/ports/clock.port'

/** Deterministic clock. Tests control "now" and can advance it explicitly. */
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

    advance(ms: number): void {
        this.current = new Date(this.current.getTime() + ms)
    }
}
