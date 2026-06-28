/**
 * Synchronous request (QueryBus) to resolve a public handle to its user id.
 * Lives in the shared kernel so auth's `UserDirectory` can dispatch it and the
 * profile module (which owns handles) can handle it without a cross-module
 * import. Returns the user id, or null when the handle is unknown.
 */
export class FindUserIdByHandleQuery {
    constructor(public readonly handle: string) {}
}
