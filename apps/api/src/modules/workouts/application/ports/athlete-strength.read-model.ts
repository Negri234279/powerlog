/** The athlete's best estimated one-rep max on an exercise they have trained. */
export interface AthleteStrengthRow {
    slug: string
    e1rmKg: number
    lastTrainedAt: Date
}

/**
 * Read-only projection of how strong an athlete is, lift by lift. Feeds the AI
 * mesocycle designer, which prescribes real kilos only for the lifts that appear
 * here and leaves the rest for the athlete to fill in.
 */
export abstract class AthleteStrengthReadModel {
    /**
     * The athlete's lifts, most recently trained first, capped at `limit`. Only
     * completed sessions count, and only sets with a computed e1RM.
     */
    abstract forUser(userId: string, limit: number): Promise<AthleteStrengthRow[]>
}
