import { join } from 'node:path'

import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo'
import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphQLModule } from '@nestjs/graphql'
import type { GraphQLFormattedError } from 'graphql'

import { type Env, isDev } from '../config/env'

/**
 * GraphQL code-first. The schema is generated from decorators into
 * src/schema.gql (consumed by the web app's codegen).
 * GraphiQL replaces the deprecated Apollo Playground.
 */
@Module({
    imports: [
        GraphQLModule.forRootAsync<ApolloDriverConfig>({
            driver: ApolloDriver,
            inject: [ConfigService],
            useFactory: (config: ConfigService<Env, true>) => ({
                // Only dev writes the SDL to disk (consumed by the web app's
                // codegen); every other stage generates it in memory. Prod runs
                // as a non-root user against a root-owned /app/src, so writing
                // there fails with EACCES.
                autoSchemaFile: isDev ? join(process.cwd(), 'src/schema.gql') : true,
                sortSchema: true,
                playground: false,
                graphiql: config.get('NODE_ENV') !== 'production',
                // Never leak server internals in error responses. The
                // GlobalExceptionFilter already sets a client-safe message + code
                // (plus the client-safe `details` of a domain error — e.g. WHICH
                // feature the plan is missing); strip everything Apollo would add on
                // top: `stacktrace`, and the `locations`/`path` dropped by rebuilding
                // the object.
                includeStacktraceInErrorResponses: false,
                formatError: (formatted: GraphQLFormattedError): GraphQLFormattedError => {
                    const { stacktrace: _stacktrace, ...extensions } = formatted.extensions ?? {}

                    return {
                        message: formatted.message,
                        extensions: { ...extensions, code: extensions['code'] ?? 'INTERNAL_SERVER_ERROR' },
                    }
                },
                // Expose req/res so resolvers/guards can read the auth cookie.
                context: ({ req, res }: { req: unknown; res: unknown }) => ({
                    req,
                    res,
                }),
            }),
        }),
    ],
})
export class GraphqlModule {}
