/**
 * List the models the user's stored key may call, fetched live from the
 * provider. Keeps the model picker honest instead of shipping a hardcoded list
 * that goes stale every time a provider ships a model.
 */
export class ListAiModelsQuery {
    constructor(
        public readonly userId: string,
        public readonly provider: string,
    ) {}
}
