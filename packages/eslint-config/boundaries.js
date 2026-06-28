import boundaries from 'eslint-plugin-boundaries'

/**
 * Clean Architecture layer-boundary rules for the NestJS API.
 *
 * Element types are the four layers inside every module:
 *   apps/api/src/modules/<module>/{domain,application,infrastructure,presentation}
 *
 * Dependency rules (default: disallow), all constrained to the SAME module
 * via the captured `${from.module}`:
 *   - domain         → domain only
 *   - application    → domain, application
 *   - infrastructure → domain, application, infrastructure
 *   - presentation   → domain, application, presentation
 *
 * Cross-module wiring must go through domain events or application ports,
 * never by importing another module's infrastructure/presentation directly.
 *
 * NOTE: paths are relative to the package cwd (apps/api), since `pnpm lint`
 * runs eslint inside each app. Pinned to eslint-plugin-boundaries v5.
 */
export const boundariesConfig = [
    {
        files: ['src/modules/**/*.ts'],
        plugins: { boundaries },
        settings: {
            'boundaries/include': ['src/modules/**/*'],
            'boundaries/elements': [
                {
                    type: 'domain',
                    pattern: 'src/modules/*/domain',
                    mode: 'folder',
                    capture: ['module'],
                },
                {
                    type: 'application',
                    pattern: 'src/modules/*/application',
                    mode: 'folder',
                    capture: ['module'],
                },
                {
                    type: 'infrastructure',
                    pattern: 'src/modules/*/infrastructure',
                    mode: 'folder',
                    capture: ['module'],
                },
                {
                    type: 'presentation',
                    pattern: 'src/modules/*/presentation',
                    mode: 'folder',
                    capture: ['module'],
                },
            ],
        },
        rules: {
            'boundaries/no-private': 'off',
            'boundaries/element-types': [
                'error',
                {
                    default: 'disallow',
                    message:
                        "Layer ${file.type} (module '${file.module}') cannot import from ${dependency.type} (module '${dependency.module}').",
                    rules: [
                        {
                            from: ['domain'],
                            allow: [['domain', { module: '${from.module}' }]],
                        },
                        {
                            from: ['application'],
                            allow: [
                                ['domain', { module: '${from.module}' }],
                                ['application', { module: '${from.module}' }],
                            ],
                        },
                        {
                            from: ['infrastructure'],
                            allow: [
                                ['domain', { module: '${from.module}' }],
                                ['application', { module: '${from.module}' }],
                                ['infrastructure', { module: '${from.module}' }],
                            ],
                        },
                        {
                            from: ['presentation'],
                            allow: [
                                ['domain', { module: '${from.module}' }],
                                ['application', { module: '${from.module}' }],
                                ['presentation', { module: '${from.module}' }],
                            ],
                        },
                    ],
                },
            ],
        },
    },
]

export default boundariesConfig
