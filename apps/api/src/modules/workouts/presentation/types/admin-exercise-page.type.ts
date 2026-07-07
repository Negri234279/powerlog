import { Field, Int, ObjectType } from '@nestjs/graphql'

import { AdminExerciseType } from './admin-exercise.type'

/** A page of catalog exercises with the total count, for the admin listing. */
@ObjectType('AdminExercisePage')
export class AdminExercisePageType {
    @Field(() => [AdminExerciseType])
    rows!: AdminExerciseType[]

    @Field(() => Int, { description: 'Total exercises matching the filter (ignoring pagination).' })
    total!: number

    @Field(() => Int)
    limit!: number

    @Field(() => Int)
    offset!: number
}
