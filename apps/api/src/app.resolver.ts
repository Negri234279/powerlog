import { Query, Resolver } from '@nestjs/graphql'

/**
 * Minimal root resolver so the code-first schema always has at least one
 * Query. Real domain resolvers (e.g. workouts) extend the schema from here.
 */
@Resolver()
export class AppResolver {
    @Query(() => String, { description: 'Liveness ping for the GraphQL schema.' })
    ping(): string {
        return 'pong'
    }
}
