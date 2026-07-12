/**
 * Cross-module read contract: lets the AI module gather everything it needs to
 * design a training block — the exercise catalog it must choose from, and how
 * strong the athlete is on the lifts they have actually trained — without
 * importing the workouts module. The implementation dispatches a
 * `GetMesocycleDesignContextQuery` over the QueryBus (global via
 * `CqrsModule.forRoot`), so the two modules stay decoupled. Mirrors
 * `SessionPlanContextReader`.
 *
 * Weights are kilograms throughout: that is how they are stored, and converting
 * for the model would only add a rounding step and a chance to get it wrong.
 */

/**
 * One exercise the model is allowed to program. The model picks by `slug` — 274
 * readable slugs cost a fraction of the tokens of as many uuids, and a model
 * fumbles them far less often. The parser maps the slug back to `exerciseId` and
 * rejects anything it cannot find, so a hallucinated lift never reaches a draft.
 *
 * The taxonomy fields are typed as `string` rather than the workouts unions: the
 * shared kernel cannot import a module's domain, and the model only ever reads
 * them.
 */
export interface CatalogExercise {
    exerciseId: string
    slug: string
    /** The exercise's canonical (English) name. */
    name: string
    category: string
    equipment: string
    primaryMuscle: string
}

/**
 * The athlete's estimated one-rep max on a lift they have trained, so the model
 * can prescribe real kilos instead of guessing. Absent for everything else, and
 * the model is told to leave those weights empty rather than invent them.
 */
export interface AthleteStrength {
    slug: string
    e1rmKg: number
    lastTrainedAt: Date
}

/** Everything the model is given about the athlete it is programming for. */
export interface MesocycleDesignContext {
    catalog: CatalogExercise[]
    /** The athlete's strongest recent lifts, newest first. Empty for a beginner. */
    strength: AthleteStrength[]
}

export abstract class MesocycleDesignContextReader {
    /**
     * Gathers the catalog plus the known strength of whoever will train the block.
     * Never null: someone with no training history simply has an empty `strength`.
     *
     * `athleteId` is set when a coach designs for one of their athletes — the loads
     * must then be anchored on the ATHLETE's lifts, not the coach's. Workouts
     * rejects the read if the two are not linked.
     */
    abstract read(userId: string, athleteId?: string | null): Promise<MesocycleDesignContext>
}
