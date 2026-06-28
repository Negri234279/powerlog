/** List the authenticated user's active sessions (one per refresh-token family). */
export class GetMySessionsQuery {
    constructor(
        public readonly userId: string,
        /** Raw refresh token of the requesting session, to flag it as current. */
        public readonly currentRefreshToken?: string,
    ) {}
}
