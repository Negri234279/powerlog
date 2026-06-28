/** Revoke all of the user's sessions except the requesting one. */
export class RevokeOtherSessionsCommand {
    constructor(
        public readonly userId: string,
        /** Raw refresh token of the session to keep alive. */
        public readonly currentRefreshToken?: string,
    ) {}
}
