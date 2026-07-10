import { AiMesocycleResolver } from './resolvers/ai-mesocycle.resolver'
import { AiPlanResolver } from './resolvers/ai-plan.resolver'
import { AiSettingsResolver } from './resolvers/ai-settings.resolver'

/** GraphQL resolvers for the AI module. */
export const AI_RESOLVERS = [AiSettingsResolver, AiPlanResolver, AiMesocycleResolver]
