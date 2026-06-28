import { Field, InputType } from '@nestjs/graphql'
import { z } from 'zod'

/** GraphQL input for `changePassword`. `currentPassword` is omitted when a
 * Google-only account sets a password for the first time. */
@InputType()
export class ChangePasswordInput {
    @Field({ nullable: true })
    currentPassword?: string

    @Field()
    newPassword!: string
}

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1).max(200).optional(),
    newPassword: z.string().min(8).max(200),
})
