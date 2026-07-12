/**
 * The proposal awaiting a decision for one (owner, trainee) pair, if there is one.
 * `athleteId` null → the caller's own block; set → the one they are designing for
 * that athlete. At most one exists per pair.
 */
export class GetMesocycleDraftQuery {
    constructor(
        public readonly userId: string,
        public readonly athleteId: string | null = null,
    ) {}
}
