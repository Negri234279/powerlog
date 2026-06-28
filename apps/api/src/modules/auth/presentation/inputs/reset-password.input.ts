import { Field, InputType } from '@nestjs/graphql'
import { z } from 'zod'

/** GraphQL input for `resetPassword` (token from the reset email + new password). */
@InputType()
export class ResetPasswordInput {
    @Field()
    token!: string

    @Field()
    newPassword!: string
}

export const resetPasswordSchema = z.object({
    token: z.string().min(1),
    newPassword: z.string().min(8).max(200),
})

/** Validates the email for `forgotPassword`. */
export const forgotPasswordSchema = z.email()
