import { Controller, type MessageEvent, Req, Sse, UseGuards } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import type { Request } from 'express'
import type { Observable } from 'rxjs'

import type { AuthUser } from '../auth/auth-user'
import { JwtCookieGuard } from '../auth/jwt-cookie.guard'
import { RealtimeHub } from './realtime.hub'

/**
 * The signed-in user's live-update stream (Server-Sent Events).
 *
 * REST is the sanctioned exception here, as it is for the Google callback and the
 * avatar upload: a long-lived one-way stream doesn't fit a GraphQL POST.
 * SSE keeps it plain HTTP — the browser's EventSource sends the auth cookie by
 * itself (the web talks to its same-origin BFF proxy), so the shared
 * `JwtCookieGuard` authenticates the connection unchanged, and a client only ever
 * gets its own stream.
 */
@Controller('events')
@UseGuards(JwtCookieGuard)
// Rate limiting counts requests per IP, which doesn't model one connection held
// open per tab — and behind the web proxy every user shares the proxy's IP, so a
// reconnect storm after a deploy would throttle real traffic.
@SkipThrottle()
export class RealtimeController {
    constructor(private readonly hub: RealtimeHub) {}

    @Sse()
    stream(@Req() req: Request): Observable<MessageEvent> {
        const user = req.user as AuthUser

        return this.hub.streamFor(user.userId)
    }
}
