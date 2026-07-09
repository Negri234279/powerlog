/**
 * Abstracts identifier creation so handlers stay deterministic and testable.
 * (This module owns its own port; modules don't share ports across boundaries.)
 */
export abstract class IdGenerator {
    abstract uuid(): string
}
