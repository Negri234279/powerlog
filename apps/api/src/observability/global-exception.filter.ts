import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Injectable } from '@nestjs/common'
import type { GqlContextType } from '@nestjs/graphql'
import { SpanStatusCode, trace } from '@opentelemetry/api'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Response } from 'express'
import { GraphQLError } from 'graphql'
import { PinoLogger } from 'nestjs-pino'
import type { Counter } from 'prom-client'

import { DomainError } from '../shared/domain/domain-error'
import { METRIC } from './metrics'

interface Classified {
    code: string
    kind: 'domain' | 'http' | 'unexpected'
    status: number
    clientMessage: string
    level: 'warn' | 'error'
    /** Client-safe specifics from a domain error (see `DomainError.details`). */
    details?: Record<string, unknown>
}

const HTTP_CODE: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHENTICATED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    429: 'TOO_MANY_REQUESTS',
}

/**
 * Single global error boundary for HTTP and GraphQL. For every exception it:
 *  - increments `domain_errors_total{code,kind}`,
 *  - records the exception on the active OTel span (so the trace shows red),
 *  - logs it through pino (carrying correlationId/trace_id/userId via the mixin)
 *    — full stack for unexpected errors, a single warn line for expected ones,
 *  - returns a client-safe response (GraphQLError or JSON), never leaking
 *    internals for unexpected errors.
 *
 * Domain errors are recognised via `DomainError` (no coupling to any module).
 */
@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
    constructor(
        private readonly logger: PinoLogger,
        @InjectMetric(METRIC.domainErrors)
        private readonly errors: Counter<string>,
    ) {
        this.logger.setContext('Exception')
    }

    catch(exception: unknown, host: ArgumentsHost): GraphQLError | void {
        const info = this.classify(exception)

        this.errors.inc({ code: info.code, kind: info.kind })

        const span = trace.getActiveSpan()
        if (span) {
            if (exception instanceof Error) {
                span.recordException(exception)
            }

            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: info.clientMessage,
            })
        }

        // Unexpected errors get the full stack (needed to debug). Expected/
        // controlled failures (domain + HTTP < 500) log a single line with the
        // message + code, no stack trace, to keep the console readable.
        if (info.level === 'error') {
            this.logger.error({ err: exception, code: info.code, kind: info.kind }, 'unhandled exception')
        } else {
            this.logger.warn({ code: info.code, kind: info.kind }, info.clientMessage)
        }

        if (host.getType<GqlContextType>() === 'graphql') {
            return new GraphQLError(info.clientMessage, {
                // `code` last: a stray `code` in details can't shadow the real one.
                extensions: { ...info.details, code: info.code },
            })
        }

        const response = host.switchToHttp().getResponse<Response>()
        response.status(info.status).json({
            ...info.details,
            statusCode: info.status,
            code: info.code,
            message: info.clientMessage,
        })
    }

    private classify(exception: unknown): Classified {
        if (exception instanceof DomainError) {
            return {
                code: exception.code,
                kind: 'domain',
                status: HttpStatus.BAD_REQUEST,
                clientMessage: exception.message,
                level: 'warn',
                ...(exception.details ? { details: exception.details } : {}),
            }
        }

        if (exception instanceof HttpException) {
            const status = exception.getStatus()
            const body = exception.getResponse()
            const raw = typeof body === 'string' ? body : (body as { message?: string | string[] }).message
            const clientMessage = Array.isArray(raw) ? raw.join('; ') : (raw ?? exception.message)

            return {
                code: HTTP_CODE[status] ?? `HTTP_${status}`,
                kind: 'http',
                status,
                clientMessage,
                level: status >= 500 ? 'error' : 'warn',
            }
        }

        return {
            code: 'INTERNAL_SERVER_ERROR',
            kind: 'unexpected',
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            clientMessage: 'Internal server error.',
            level: 'error',
        }
    }
}
