/**
 * Base for all domain errors across modules. Carries a stable `code` (mapped to
 * GraphQL `extensions.code` / HTTP body and to the `domain_errors_total` metric)
 * and a client-safe message. The global exception filter recognises any
 * `DomainError` without coupling to a specific module.
 */
export abstract class DomainError extends Error {
    abstract readonly code: string

    constructor(message: string) {
        super(message)
        // Preserve the concrete subclass name (e.g. "EmailAlreadyInUseError").
        this.name = new.target.name
    }
}
