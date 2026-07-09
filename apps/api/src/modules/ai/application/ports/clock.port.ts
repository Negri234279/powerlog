/**
 * Abstracts the current time so handlers stay deterministic and testable.
 * Infrastructure binds it to a system clock. (This module owns its own port;
 * modules don't share ports across boundaries.)
 */
export abstract class Clock {
    abstract now(): Date
}
