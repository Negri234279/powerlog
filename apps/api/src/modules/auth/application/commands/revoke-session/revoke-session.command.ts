/** Revoke a single session (refresh-token family) belonging to the user. */
export class RevokeSessionCommand {
    constructor(
        public readonly userId: string,
        public readonly sessionId: string,
    ) {}
}
