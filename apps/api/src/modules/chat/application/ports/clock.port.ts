/**
 * Abstracts the current time so handlers stay deterministic and testable.
 * Infrastructure binds it to a system clock. (Each module owns its own port;
 * ports aren't shared across boundaries.)
 */
export abstract class Clock {
    abstract now(): Date
}
