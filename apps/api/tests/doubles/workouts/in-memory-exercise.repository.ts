import type { ExerciseEntity } from '../../../src/modules/workouts/domain/entities/exercise.entity'
import { EXERCISE_CATEGORIES } from '../../../src/modules/workouts/domain/exercise-taxonomy'
import {
    ExerciseRepository,
    type ExerciseFilter,
    type ExercisePagination,
} from '../../../src/modules/workouts/domain/repositories/exercise.repository'

/**
 * In-memory ExerciseRepository. Mirrors the Drizzle ordering: by category in
 * enum-declaration order (Postgres orders enums that way, not alphabetically),
 * then by name. Reference counts are seeded via `setReferences` for delete tests.
 */
export class InMemoryExerciseRepository extends ExerciseRepository {
    private readonly references = new Map<string, number>()

    constructor(private items: ExerciseEntity[] = []) {
        super()
    }

    private match(filter?: ExerciseFilter): ExerciseEntity[] {
        const search = filter?.search?.toLowerCase()
        const filtered = this.items.filter(
            (e) =>
                (!filter?.categories?.length || filter.categories.includes(e.category)) &&
                (!filter?.equipment?.length || filter.equipment.includes(e.equipment)) &&
                (!filter?.muscles?.length || filter.muscles.includes(e.primaryMuscle)) &&
                (!search || e.name.toLowerCase().includes(search) || e.slug.toLowerCase().includes(search)),
        )
        return [...filtered].sort(
            (a, b) =>
                EXERCISE_CATEGORIES.indexOf(a.category) - EXERCISE_CATEGORIES.indexOf(b.category) ||
                a.name.localeCompare(b.name),
        )
    }

    async findAll(filter?: ExerciseFilter, pagination?: ExercisePagination): Promise<ExerciseEntity[]> {
        const matched = this.match(filter)
        return pagination ? matched.slice(pagination.offset, pagination.offset + pagination.limit) : matched
    }

    async count(filter?: ExerciseFilter): Promise<number> {
        return this.match(filter).length
    }

    async findById(id: string): Promise<ExerciseEntity | null> {
        return this.items.find((e) => e.id === id) ?? null
    }

    async findBySlug(slug: string): Promise<ExerciseEntity | null> {
        return this.items.find((e) => e.slug === slug) ?? null
    }

    async insert(exercise: ExerciseEntity): Promise<void> {
        this.items.push(exercise)
    }

    async update(exercise: ExerciseEntity): Promise<void> {
        this.items = this.items.map((e) => (e.id === exercise.id ? exercise : e))
    }

    async delete(id: string): Promise<void> {
        this.items = this.items.filter((e) => e.id !== id)
    }

    async countReferences(exerciseId: string): Promise<number> {
        return this.references.get(exerciseId) ?? 0
    }

    /** Test helper: pretend `count` workout entries reference this exercise. */
    setReferences(exerciseId: string, count: number): void {
        this.references.set(exerciseId, count)
    }

    /** Test helper: current catalog snapshot. */
    all(): ExerciseEntity[] {
        return [...this.items]
    }
}
