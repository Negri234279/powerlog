/** Roll up the caller's own AI spend: one line per (provider, model) plus totals. */
export class GetMyAiUsageQuery {
    constructor(public readonly userId: string) {}
}
