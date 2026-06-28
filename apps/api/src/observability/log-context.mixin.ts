import { ClsServiceManager } from 'nestjs-cls'

/**
 * Pino mixin: stamps every log line with the request's `correlationId` (and
 * `userId`, once authenticated) from the CLS context. `trace_id`/`span_id` are
 * already injected by OpenTelemetry's pino instrumentation, so together a log
 * line links to its request, its user and its distributed trace.
 *
 * Uses the static ClsService accessor because pino mixins run outside DI.
 * Returns nothing for logs emitted outside a request (e.g. during bootstrap).
 */
export function logContextMixin(): Record<string, string> {
    const cls = ClsServiceManager.getClsService()
    if (!cls.isActive()) {
        return {}
    }

    const context: Record<string, string> = { correlationId: cls.getId() }
    const userId = cls.get<string | undefined>('userId')

    if (userId) {
        context['userId'] = userId
    }

    return context
}
