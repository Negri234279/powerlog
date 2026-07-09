import { Field, ID, InputType } from '@nestjs/graphql'
import { z } from 'zod'

@InputType()
export class RefinePlanDraftInput {
    @Field(() => ID)
    draftId!: string

    @Field(() => String, { description: 'What to change, e.g. "less volume, I slept badly".' })
    message!: string
}

export const refinePlanDraftSchema = z.object({
    draftId: z.uuid(),
    // Long enough for a real instruction, short enough that the prompt stays sane.
    message: z.string().trim().min(1).max(1000),
})

export const uuidSchema = z.uuid()
