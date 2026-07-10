import type {
    AthleteStrength,
    CatalogExercise,
    MesocycleDesignContext,
} from '../../../src/shared/contracts/mesocycle-design-context'

/** Stable ids the specs assert the parser resolved slugs to. */
export const CATALOG_IDS = {
    squat: '22222222-2222-4222-8222-222222222222',
    bench: '33333333-3333-4333-8333-333333333333',
    row: '44444444-4444-4444-8444-444444444444',
} as const

const catalog: CatalogExercise[] = [
    {
        exerciseId: CATALOG_IDS.squat,
        slug: 'low-bar-squat',
        name: 'Low-Bar Back Squat',
        category: 'squat',
        equipment: 'barbell',
        primaryMuscle: 'quads',
    },
    {
        exerciseId: CATALOG_IDS.bench,
        slug: 'bench-press',
        name: 'Bench Press',
        category: 'bench',
        equipment: 'barbell',
        primaryMuscle: 'chest',
    },
    {
        exerciseId: CATALOG_IDS.row,
        slug: 'barbell-row',
        name: 'Barbell Row',
        category: 'back',
        equipment: 'barbell',
        primaryMuscle: 'back',
    },
]

const strength: AthleteStrength[] = [
    { slug: 'low-bar-squat', e1rmKg: 180, lastTrainedAt: new Date('2026-06-28T00:00:00.000Z') },
    { slug: 'bench-press', e1rmKg: 120, lastTrainedAt: new Date('2026-07-02T00:00:00.000Z') },
]

export const MesocycleDesignContextMother = {
    /** A three-lift catalog, with history on two of them. */
    create(overrides: Partial<MesocycleDesignContext> = {}): MesocycleDesignContext {
        return {
            catalog: overrides.catalog ?? catalog.map((exercise) => ({ ...exercise })),
            strength: overrides.strength ?? strength.map((lift) => ({ ...lift })),
        }
    },

    /** An athlete who has never logged a session: the model must leave weights null. */
    withoutHistory(): MesocycleDesignContext {
        return MesocycleDesignContextMother.create({ strength: [] })
    },
}
