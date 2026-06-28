/** Read the authenticated user's profile. */
export class GetMyProfileQuery {
    constructor(public readonly userId: string) {}
}
