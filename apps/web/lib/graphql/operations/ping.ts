import { graphql } from '@/lib/graphql/__generated__'

/** Liveness query — smoke-tests the typed GraphQL pipeline end to end. */
export const PingDocument = graphql(`
    query Ping {
        ping
    }
`)
