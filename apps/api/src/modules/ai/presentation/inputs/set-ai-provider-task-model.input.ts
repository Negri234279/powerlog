import { Field, InputType } from '@nestjs/graphql'
import { z } from 'zod'

import { aiProviderSchema, modelSchema } from './ai-provider.schema'

@InputType()
export class SetAiProviderTaskModelInput {
    @Field(() => String, { description: '"openai" or "anthropic".' })
    provider!: string

    @Field(() => String, { description: 'The task: "mesocycle" or "session_plan".' })
    kind!: string

    @Field(() => String, { nullable: true, description: 'Model id, or null to fall back to the default model.' })
    model!: string | null
}

export const setAiProviderTaskModelSchema = z.object({
    provider: aiProviderSchema,
    kind: z.enum(['mesocycle', 'session_plan']),
    model: modelSchema.nullable(),
})
