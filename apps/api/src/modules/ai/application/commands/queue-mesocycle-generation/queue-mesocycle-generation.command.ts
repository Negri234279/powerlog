/** Ask for the template week of a training block to be designed. */
export class QueueMesocycleGenerationCommand {
    constructor(
        public readonly userId: string,
        /** How many weeks the block runs for; the template week is replicated into each. */
        public readonly weeks: number,
        /** The 0–6 offsets the athlete trains on. The model must program exactly these. */
        public readonly trainingDays: number[],
        public readonly goal: string | null = null,
        /** The athlete's own words. Untrusted input, framed as data for the model. */
        public readonly prompt: string | null = null,
        /** Set when a coach designs the block for one of their athletes. */
        public readonly athleteId: string | null = null,
    ) {}
}
