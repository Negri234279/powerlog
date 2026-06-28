import { Field, ID, ObjectType } from '@nestjs/graphql'

/**
 * A catalog exercise over GraphQL. Enum-like fields are exposed as strings
 * (matching the rest of the schema); values come from the fixed taxonomy.
 */
@ObjectType('Exercise')
export class ExerciseType {
    @Field(() => ID)
    id!: string

    @Field()
    slug!: string

    @Field()
    name!: string

    @Field(() => String, { description: 'squat | bench | deadlift | chest | back | shoulders | legs | arms | core' })
    category!: string

    @Field(() => String, { description: 'barbell | dumbbell | machine | cable | bodyweight' })
    equipment!: string

    @Field(() => String, { description: 'Primary muscle worked.' })
    primaryMuscle!: string
}
