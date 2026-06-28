/** Read the authenticated user's profile. */
export class GetMeQuery {
    constructor(public readonly userId: string) {}
}
