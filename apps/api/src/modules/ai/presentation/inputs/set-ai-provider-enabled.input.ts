import { Field, InputType } from '@nestjs/graphql'
import { z } from 'zod'

import { aiProviderSchema } from './ai-provider.schema'

@InputType()
export class SetAiProviderEnabledInput {
    @Field(() => String, { description: '"openai" or "anthropic".' })
    provider!: string

    @Field(() => Boolean)
    enabled!: boolean
}

export const setAiProviderEnabledSchema = z.object({
    provider: aiProviderSchema,
    enabled: z.boolean(),
})
