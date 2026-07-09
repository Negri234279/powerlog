import { PinoLogger } from 'nestjs-pino'

/**
 * A real PinoLogger wired to pino's `silent` level, for handlers that take one
 * as a dependency. Nothing is asserted on it — logging is a side effect, not
 * behaviour — it just keeps the test output clean without mocking the logger.
 */
export const silentLogger = (): PinoLogger => new PinoLogger({ pinoHttp: { level: 'silent' } })
