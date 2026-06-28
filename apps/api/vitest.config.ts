import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        root: './',
        include: ['src/**/*.spec.ts', '__e2e__/**/*.spec.ts'],
        setupFiles: ['./__e2e__/setup-env.ts'],
        // Domain unit tests run instantly; integration tests spin up
        // Testcontainers, so give them room.
        testTimeout: 60_000,
        hookTimeout: 120_000,
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.spec.ts', 'src/main.ts', 'src/**/index.ts'],
        },
    },
    // SWC transforms NestJS decorators + emitDecoratorMetadata for Vitest.
    plugins: [swc.vite({ module: { type: 'es6' } })],
})
