/** e1RM progression + projection for one exercise, optionally within a range. */
export class GetStrengthProgressionQuery {
    constructor(
        public readonly userId: string,
        public readonly exerciseId: string,
        public readonly from?: string | null,
        public readonly to?: string | null,
    ) {}
}
