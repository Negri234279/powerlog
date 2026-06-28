import { baseConfig } from '@powerlog/eslint-config'
import { boundariesConfig } from '@powerlog/eslint-config/boundaries'

export default [
    ...baseConfig,
    ...boundariesConfig,
    {
        // NestJS DI relies on emitDecoratorMetadata: ports/repositories injected by
        // their abstract class must be VALUE imports or the runtime token is lost.
        // `consistent-type-imports` can't tell, so it's off for the API source.
        files: ['src/**/*.ts'],
        rules: {
            '@typescript-eslint/consistent-type-imports': 'off',
            // All env access goes through src/config/env.ts (the validated `env`
            // object + flags) or ConfigService<Env>. Never read process.env elsewhere.
            'no-process-env': 'error',
        },
    },
    {
        // The single place allowed to read process.env: the env loader/validator.
        files: ['src/config/env.ts'],
        rules: {
            'no-process-env': 'off',
        },
    },
    {
        // Tests and infra files may reach across layers freely.
        files: ['test/**/*.ts', '**/*.spec.ts', 'drizzle.config.ts'],
        rules: {
            'boundaries/element-types': 'off',
        },
    },
]
