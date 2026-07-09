import { Field, InputType } from '@nestjs/graphql'
import { z } from 'zod'

import { aiProviderSchema, modelSchema } from './ai-provider.schema'

@InputType()
export class UpdateAiProviderModelInput {
    @Field(() => String, { description: '"openai" or "anthropic".' })
    provider!: string

    @Field(() => String, { nullable: true, description: 'Model id, or null to clear the selection.' })
    model!: string | null
}

export const updateAiProviderModelSchema = z.object({
    provider: aiProviderSchema,
    model: modelSchema.nullable(),
})
