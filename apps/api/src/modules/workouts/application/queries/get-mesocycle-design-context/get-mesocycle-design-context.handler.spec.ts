import { describe, expect, it } from 'vitest'

import { GetMesocycleDesignContextQuery } from '../../../../../shared/contracts/get-mesocycle-design-context.query'
import { ExerciseEntity } from '../../../domain/entities/exercise.entity'
import { ExerciseRepository } from '../../../domain/repositories/exercise.repository'
import { type AthleteStrengthRow, AthleteStrengthReadModel } from '../../ports/athlete-strength.read-model'
import { GetMesocycleDesignContextHandler } from './get-mesocycle-design-context.handler'

const USER_ID = '11111111-1111-4111-8111-111111111111'

const squat = ExerciseEntity.create({
    id: '22222222-2222-4222-8222-222222222222',
    slug: 'low-bar-squat',
    name: 'Low-Bar Back Squat',
    category: 'squat',
    equipment: 'barbell',
    primaryMuscle: 'quads',
})

class StubExerciseRepository extends ExerciseRepository {
    async findAll(): Promise<ExerciseEntity[]> {
        return [squat]
    }
    async count(): Promise<number> {
        return 1
    }
    async findById(): Promise<ExerciseEntity | null> {
        return null
    }
    async findBySlug(): Promise<ExerciseEntity | null> {
        return null
    }
    async insert(): Promise<void> {}
    async update(): Promise<void> {}
    async delete(): Promise<void> {}
    async countReferences(): Promise<number> {
        return 0
    }
    async upsertTranslation(): Promise<void> {}
    async deleteTranslation(): Promise<void> {}
    async translationsFor(): Promise<Map<string, string>> {
        return new Map()
    }
}

class StubAthleteStrengthReadModel extends AthleteStrengthReadModel {
    readonly calls: { userId: string; limit: number }[] = []

    constructor(private readonly rows: AthleteStrengthRow[] = []) {
        super()
    }

    async forUser(userId: string, limit: number): Promise<AthleteStrengthRow[]> {
        this.calls.push({ userId, limit })

        return this.rows
    }
}

const buildHandler = (strength = new StubAthleteStrengthReadModel()) =>
    new GetMesocycleDesignContextHandler(new StubExerciseRepository(), strength)

describe('GetMesocycleDesignContextHandler', () => {
    it('serves the catalog the model must choose from, keyed by slug', async () => {
        const context = await buildHandler().execute(new GetMesocycleDesignContextQuery(USER_ID, 30))

        expect(context.catalog).toEqual([
            {
                exerciseId: squat.id,
                slug: 'low-bar-squat',
                name: 'Low-Bar Back Squat',
                category: 'squat',
                equipment: 'barbell',
                primaryMuscle: 'quads',
            },
        ])
    })

    it('passes the strength limit through, so the prompt stays bounded', async () => {
        const strength = new StubAthleteStrengthReadModel()

        await buildHandler(strength).execute(new GetMesocycleDesignContextQuery(USER_ID, 30))

        expect(strength.calls).toEqual([{ userId: USER_ID, limit: 30 }])
    })

    it('serves an empty strength list for an athlete with no history, rather than failing', async () => {
        const context = await buildHandler().execute(new GetMesocycleDesignContextQuery(USER_ID, 30))

        expect(context.strength).toEqual([])
    })

    it('reports the athlete’s known lifts so the model can prescribe real kilos', async () => {
        const lift = { slug: 'low-bar-squat', e1rmKg: 180, lastTrainedAt: new Date('2026-06-28T00:00:00.000Z') }

        const context = await buildHandler(new StubAthleteStrengthReadModel([lift])).execute(
            new GetMesocycleDesignContextQuery(USER_ID, 30),
        )

        expect(context.strength).toEqual([lift])
    })
})
