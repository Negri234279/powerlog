/** Read every provider configuration the authenticated user owns. */
export class GetMyAiSettingsQuery {
    constructor(public readonly userId: string) {}
}
