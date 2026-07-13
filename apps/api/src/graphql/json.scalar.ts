import { type CustomScalar, Scalar } from '@nestjs/graphql'
import { Kind, type ValueNode } from 'graphql'

/**
 * Marker type for the JSON scalar — what you point `@Field`/`@Query` at:
 * `@Field(() => JsonValue)`.
 *
 * It is a class rather than a bare `GraphQLScalarType` on purpose: Nest maps
 * class-based scalars by **class identity**, while a raw scalar object is matched
 * with `instanceof GraphQLScalarType`. Under Vitest the app can end up holding two
 * copies of `graphql` (ESM for our sources, CJS for Nest's dist), and that
 * `instanceof` then quietly fails — schema build dies with "cannot determine a
 * GraphQL output type". Identity has no such problem.
 */
export class JsonValue {}

/**
 * An arbitrary JSON value.
 *
 * Used for the plans' `entitlements`, which are jsonb on purpose: adding a feature
 * check must be a line in the zod schema plus a field in the admin form — **not a
 * migration and not a GraphQL type change**. Typing the shape here would be a
 * third definition to keep in step with the other two.
 *
 * The value is not unvalidated, it is validated where it belongs: by zod, against
 * the plan's audience, in the domain. Nothing whose shape IS known should reach
 * for this scalar — that gets a real type.
 */
@Scalar('JSON', () => JsonValue)
export class JsonScalar implements CustomScalar<unknown, unknown> {
    description = 'An arbitrary JSON value (validated against a schema by the server).'

    /** Already JSON on the way out, and on the way in as a variable. */
    serialize(value: unknown): unknown {
        return value
    }

    parseValue(value: unknown): unknown {
        return value
    }

    /** Inline literals in the query document, back into a plain JS value. */
    parseLiteral(node: ValueNode): unknown {
        return parseLiteral(node)
    }
}

function parseLiteral(node: ValueNode): unknown {
    switch (node.kind) {
        case Kind.STRING:
        case Kind.BOOLEAN:
            return node.value
        case Kind.INT:
        case Kind.FLOAT:
            return Number(node.value)
        case Kind.NULL:
            return null
        case Kind.LIST:
            return node.values.map(parseLiteral)
        case Kind.OBJECT:
            return Object.fromEntries(node.fields.map((field) => [field.name.value, parseLiteral(field.value)]))
        default:
            // A variable or an enum has no meaning as a JSON literal.
            return null
    }
}
