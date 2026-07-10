/**
 * Synchronous request (QueryBus) for the context needed to design a training
 * block. Lives in the shared kernel so the AI-side adapter can dispatch it and
 * the workouts module can handle it without a cross-module import. Returns a
 * `MesocycleDesignContext`.
 */
export class GetMesocycleDesignContextQuery {
    constructor(
        public readonly userId: string,
        /**
         * How many of the athlete's lifts to include, strongest-recent first.
         * Bounded here rather than in the caller: the whole catalog would bloat
         * the prompt, and the model only needs the lifts it will actually load.
         */
        public readonly strengthLimit: number,
    ) {}
}
