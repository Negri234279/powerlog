import { Field, ObjectType } from '@nestjs/graphql'

import { ExerciseType } from './exercise.type'

/**
 * A catalog exercise for the admin panel: the canonical (English) fields plus the
 * editable Spanish name (`nameEs`, null when there's no translation yet). The
 * athlete-facing `ExerciseType` never carries `nameEs` — names are localized there.
 */
@ObjectType('AdminExercise')
export class AdminExerciseType extends ExerciseType {
    @Field(() => String, { nullable: true, description: 'Spanish display name; null → English fallback.' })
    nameEs?: string | null
}
