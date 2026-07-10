import { Field, ID, InputType } from '@nestjs/graphql'
import { z } from 'zod'

@InputType()
export class GenerateSessionPlanDraftInput {
    @Field(() => ID)
    sessionId!: string

    @Field(() => ID, { nullable: true, description: 'Program only this exercise entry; omit for the whole session.' })
    entryId?: string | null

    @Field(() => String, {
        nullable: true,
        description: 'Anything the model should know, e.g. "shoulder is sore, keep pressing light".',
    })
    extraInfo?: string | null
}

export const generateSessionPlanDraftSchema = z.object({
    sessionId: z.uuid(),
    entryId: z.uuid().nullable().optional(),
    // Long enough for real context, short enough that the prompt stays sane.
    extraInfo: z.string().trim().min(1).max(1000).nullable().optional(),
})
