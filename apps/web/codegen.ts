import type { CodegenConfig } from '@graphql-codegen/cli'

/**
 * Generates a typed `graphql()` function + TypedDocumentNodes from the API's
 * committed SDL (`apps/api/src/schema.gql`) and the operations written inline in
 * the app via `graphql(\`…\`)`. No running server needed. Run `pnpm codegen`
 * after the API schema changes; output lives in `lib/graphql/__generated__/`.
 */
const config: CodegenConfig = {
    schema: '../api/src/schema.gql',
    documents: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
    ignoreNoDocuments: true,
    generates: {
        './lib/graphql/__generated__/': {
            preset: 'client',
            presetConfig: {
                // Flat usage: `graphql()` returns ready-to-run typed documents.
                fragmentMasking: false,
            },
            config: {
                useTypeImports: true,
                // The API's DateTime scalar is serialized as an ISO string.
                scalars: { DateTime: 'string' },
                avoidOptionals: { field: true },
            },
        },
    },
}

export default config
