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

    /**
     * Extra client-safe fields the exception filter merges into the GraphQL
     * `extensions` and the HTTP body. Override it when the client has to act on
     * the specifics rather than just report them — e.g. WHICH feature the plan is
     * missing, so the web can offer the upgrade for that one.
     *
     * Client-safe means client-safe: no PII, no internals, no ids the caller
     * isn't already allowed to see.
     */
    get details(): Record<string, unknown> | undefined {
        return undefined
    }
}
