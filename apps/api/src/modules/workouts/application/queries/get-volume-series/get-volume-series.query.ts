/** Weekly training-volume series for the caller, optionally within a range. */
export class GetVolumeSeriesQuery {
    constructor(
        public readonly userId: string,
        public readonly from?: string | null,
        public readonly to?: string | null,
    ) {}
}
