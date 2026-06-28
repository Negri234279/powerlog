import { Field, Int, ObjectType } from '@nestjs/graphql'

import { ExerciseType } from './exercise.type'

/** A page of catalog exercises with the total count, for the admin listing. */
@ObjectType('AdminExercisePage')
export class AdminExercisePageType {
    @Field(() => [ExerciseType])
    rows!: ExerciseType[]

    @Field(() => Int, { description: 'Total exercises matching the filter (ignoring pagination).' })
    total!: number

    @Field(() => Int)
    limit!: number

    @Field(() => Int)
    offset!: number
}
