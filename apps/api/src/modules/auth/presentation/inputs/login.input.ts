import { Field, InputType } from '@nestjs/graphql'
import { z } from 'zod'

/** GraphQL shape for `login`. */
@InputType()
export class LoginInput {
    @Field()
    email!: string

    @Field()
    password!: string
}

export const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
})
