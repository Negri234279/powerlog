import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'
import globals from 'globals'

/**
 * Shared base flat config for the powerlog monorepo.
 * TypeScript + recommended rules + Prettier compatibility.
 * Layer-boundary rules live in ./boundaries.js (API only).
 */
export const baseConfig = tseslint.config(
    {
        ignores: [
            '**/dist/**',
            '**/.next/**',
            '**/coverage/**',
            '**/node_modules/**',
            '**/*.config.{js,cjs,mjs,ts}',
            '**/drizzle.config.ts',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/consistent-type-imports': [
                'warn',
                { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
        },
    },
    prettier,
)

export default baseConfig
