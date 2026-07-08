/** Fetch one of the caller's mesocycles with its full microcycle/day/set tree. */
export class GetMesocycleQuery {
    constructor(
        public readonly ownerId: string,
        public readonly mesocycleId: string,
    ) {}
}
