/**
 * One mesocycle draft by id, whatever its status — the history's detail view.
 * `GetMesocycleDraftQuery` answers a different question: the *open* draft for a
 * (owner, trainee) pair, which is what the builder screen needs.
 */
export class GetMesocycleDraftByIdQuery {
    constructor(
        public readonly userId: string,
        public readonly draftId: string,
    ) {}
}
