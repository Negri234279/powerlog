import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The running app version, read from this package's `package.json` — used as the
 * OpenTelemetry resource `service.version` (so traces/metrics carry the deployed
 * release). `package.json` sits one level above this file's directory in `src/`,
 * `dist/` and the production image (`pnpm deploy` puts it next to `dist/`).
 */
function readAppVersion(): string {
    try {
        const raw = readFileSync(join(__dirname, '..', 'package.json'), 'utf8')
        return (JSON.parse(raw) as { version?: string }).version ?? '0.0.0'
    } catch {
        return '0.0.0'
    }
}

export const APP_VERSION = readAppVersion()
