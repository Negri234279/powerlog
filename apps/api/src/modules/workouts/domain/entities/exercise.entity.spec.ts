import { describe, expect, it } from 'vitest'

import { InvalidExerciseError } from '../errors/workouts.errors'
import { ExerciseEntity, type ExerciseProps } from './exercise.entity'

const valid: ExerciseProps = {
    id: 'ex-1',
    slug: 'back-squat',
    name: 'Back Squat',
    category: 'squat',
    equipment: 'barbell',
    primaryMuscle: 'quads',
}

describe('ExerciseEntity.create', () => {
    it('creates a valid exercise and trims the name', () => {
        const exercise = ExerciseEntity.create({ ...valid, name: '  Back Squat  ' })

        expect(exercise.name).toBe('Back Squat')
        expect(exercise.slug).toBe('back-squat')
        expect(exercise.category).toBe('squat')
    })

    it('rejects an empty name', () => {
        expect(() => ExerciseEntity.create({ ...valid, name: '   ' })).toThrow(InvalidExerciseError)
    })

    it('rejects a malformed slug', () => {
        expect(() => ExerciseEntity.create({ ...valid, slug: 'Back Squat' })).toThrow(InvalidExerciseError)
        expect(() => ExerciseEntity.create({ ...valid, slug: 'ab' })).toThrow(InvalidExerciseError)
    })

    it('rejects values outside the taxonomy', () => {
        expect(() => ExerciseEntity.create({ ...valid, category: 'cardio' as never })).toThrow(InvalidExerciseError)
        expect(() => ExerciseEntity.create({ ...valid, equipment: 'kettlebell' as never })).toThrow(
            InvalidExerciseError,
        )
        expect(() => ExerciseEntity.create({ ...valid, primaryMuscle: 'neck' as never })).toThrow(InvalidExerciseError)
    })
})

describe('ExerciseEntity.slugFrom', () => {
    it('derives a slug from a name', () => {
        expect(ExerciseEntity.slugFrom('Romanian Deadlift')).toBe('romanian-deadlift')
        expect(ExerciseEntity.slugFrom('  Close-Grip Bench  ')).toBe('close-grip-bench')
        expect(ExerciseEntity.slugFrom('Curl (EZ Bar)')).toBe('curl-ez-bar')
    })
})

describe('ExerciseEntity.update', () => {
    it('applies edits and leaves untouched fields (and the slug) intact', () => {
        const exercise = ExerciseEntity.create(valid)

        exercise.update({ name: 'High-Bar Squat', primaryMuscle: 'glutes' })

        expect(exercise.name).toBe('High-Bar Squat')
        expect(exercise.primaryMuscle).toBe('glutes')
        expect(exercise.category).toBe('squat')
        expect(exercise.slug).toBe('back-squat')
    })

    it('rejects an invalid edit', () => {
        const exercise = ExerciseEntity.create(valid)

        expect(() => exercise.update({ name: '' })).toThrow(InvalidExerciseError)
        expect(() => exercise.update({ category: 'mobility' as never })).toThrow(InvalidExerciseError)
    })
})
