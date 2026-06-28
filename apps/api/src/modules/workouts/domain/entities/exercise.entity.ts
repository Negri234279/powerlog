import { InvalidExerciseError } from '../errors/workouts.errors'
import {
    EXERCISE_CATEGORIES,
    EXERCISE_EQUIPMENT,
    EXERCISE_MUSCLES,
    type ExerciseCategory,
    type ExerciseEquipment,
    type ExerciseMuscle,
} from '../exercise-taxonomy'

export interface ExerciseProps {
    id: string
    /** Stable human-readable key (e.g. `back-squat`). Set on create, immutable after. */
    slug: string
    name: string
    category: ExerciseCategory
    equipment: ExerciseEquipment
    primaryMuscle: ExerciseMuscle
}

/** Editable fields of a catalog exercise (slug is immutable). */
export type ExercisePatch = Partial<Pick<ExerciseProps, 'name' | 'category' | 'equipment' | 'primaryMuscle'>>

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const NAME_MAX = 80
const SLUG_MIN = 3
const SLUG_MAX = 60

/**
 * `ExerciseEntity` — a catalog exercise. Originally seeded reference data; admins
 * can now create/edit/delete it (`workout_sets` reference it by `id`). The `slug`
 * is the stable key (seed idempotency + display), so it is fixed on `create`.
 */
export class ExerciseEntity {
    private constructor(private props: ExerciseProps) {}

    /** Rehydrate from persistence (no validation — trusts stored data). */
    static rehydrate(props: ExerciseProps): ExerciseEntity {
        return new ExerciseEntity(props)
    }

    /** Create a new catalog exercise, validating every field. */
    static create(props: ExerciseProps): ExerciseEntity {
        const name = props.name.trim()
        if (name.length === 0 || name.length > NAME_MAX) {
            throw new InvalidExerciseError(`Name must be between 1 and ${NAME_MAX} characters.`)
        }

        if (props.slug.length < SLUG_MIN || props.slug.length > SLUG_MAX || !SLUG_RE.test(props.slug)) {
            throw new InvalidExerciseError('Slug must be lowercase letters, digits and single hyphens.')
        }

        assertTaxonomy(props.category, props.equipment, props.primaryMuscle)

        return new ExerciseEntity({ ...props, name })
    }

    /** Derive a slug from a name (`Back Squat` → `back-squat`). */
    static slugFrom(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
    }

    /** Apply an edit (slug excluded — it is immutable). */
    update(patch: ExercisePatch): void {
        const next: ExerciseProps = {
            ...this.props,
            ...patch,
            name: patch.name !== undefined ? patch.name.trim() : this.props.name,
        }

        if (next.name.length === 0 || next.name.length > NAME_MAX) {
            throw new InvalidExerciseError(`Name must be between 1 and ${NAME_MAX} characters.`)
        }

        assertTaxonomy(next.category, next.equipment, next.primaryMuscle)

        this.props = next
    }

    get id(): string {
        return this.props.id
    }

    get slug(): string {
        return this.props.slug
    }

    get name(): string {
        return this.props.name
    }

    get category(): ExerciseCategory {
        return this.props.category
    }

    get equipment(): ExerciseEquipment {
        return this.props.equipment
    }

    get primaryMuscle(): ExerciseMuscle {
        return this.props.primaryMuscle
    }
}

function assertTaxonomy(category: string, equipment: string, primaryMuscle: string): void {
    if (!(EXERCISE_CATEGORIES as readonly string[]).includes(category)) {
        throw new InvalidExerciseError('Unknown exercise category.')
    }

    if (!(EXERCISE_EQUIPMENT as readonly string[]).includes(equipment)) {
        throw new InvalidExerciseError('Unknown exercise equipment.')
    }

    if (!(EXERCISE_MUSCLES as readonly string[]).includes(primaryMuscle)) {
        throw new InvalidExerciseError('Unknown primary muscle.')
    }
}
