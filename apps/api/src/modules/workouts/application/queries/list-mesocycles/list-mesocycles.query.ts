/** List the caller's mesocycles (newest first), with optional name search. */
export class ListMesocyclesQuery {
    constructor(
        public readonly ownerId: string,
        public readonly search?: string,
    ) {}
}
