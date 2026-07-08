export class GenerateMesocycleWeekCommand {
    constructor(
        public readonly userId: string,
        public readonly mesocycleId: string,
        /** 1-based week to generate. */
        public readonly week: number,
        /** ISO date (YYYY-MM-DD) overriding the mesocycle's start date as the anchor. */
        public readonly weekStartDate?: string | null,
        /** Delete the week's still-planned sessions first, then regenerate. */
        public readonly replace?: boolean,
    ) {}
}
