/** Abstracts "now" so handlers are deterministic under test. */
export abstract class Clock {
    abstract now(): Date
}
