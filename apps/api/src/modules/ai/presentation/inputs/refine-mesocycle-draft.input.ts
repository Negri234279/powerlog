import { Field, ID, InputType } from '@nestjs/graphql'
import { z } from 'zod'

@InputType()
export class RefineMesocycleDraftInput {
    @Field(() => ID)
    draftId!: string

    @Field(() => String, { description: 'What to change, e.g. "swap the leg press for lunges".' })
    message!: string
}

export const refineMesocycleDraftSchema = z.object({
    draftId: z.uuid(),
    // Shorter than a session-plan refinement: a revision names what to change, and
    // a long message here is more often an attempt to talk the model out of its job.
    message: z.string().trim().min(1).max(500),
})
