import { UseGuards } from '@nestjs/common'
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'
import { z } from 'zod'

import type { AuthUser } from '../../auth/auth-user'
import { CurrentUser } from '../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../auth/jwt-cookie.guard'
import { ZodValidationPipe } from '../../shared/zod-validation.pipe'
import { PushSubscriptionStore } from '../push-subscription-store'
import { PushTransport } from '../sender/push-transport'
import {
    RegisterPushSubscriptionInput,
    registerPushSubscriptionSchema,
} from './inputs/register-push-subscription.input'

const endpointArg = z.url().max(2000)

/**
 * The client surface for Web Push. Transversal transport, so it talks to the
 * store directly (no CommandBus) — same shape as the realtime SSE controller
 * talking to the hub.
 */
@Resolver()
@UseGuards(JwtCookieGuard)
export class PushResolver {
    constructor(
        private readonly store: PushSubscriptionStore,
        private readonly transport: PushTransport,
    ) {}

    @Query(() => String, {
        nullable: true,
        description: 'VAPID public key for Web Push subscriptions; null when push is not configured.',
    })
    pushPublicKey(): string | null {
        return this.transport.publicKey
    }

    @Mutation(() => Boolean, {
        description: 'Register a browser push subscription for the caller. False when push is not configured.',
    })
    async registerPushSubscription(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(registerPushSubscriptionSchema)) input: RegisterPushSubscriptionInput,
    ): Promise<boolean> {
        if (this.transport.publicKey === null) return false

        await this.store.save({
            userId: user.userId,
            endpoint: input.endpoint,
            p256dh: input.p256dh,
            auth: input.auth,
            locale: input.locale ?? 'en',
            userAgent: input.userAgent ?? null,
        })

        return true
    }

    @Mutation(() => Boolean, {
        description: "Remove one of the caller's push subscriptions by endpoint (no-op if not theirs).",
    })
    async removePushSubscription(
        @CurrentUser() user: AuthUser,
        @Args('endpoint', new ZodValidationPipe(endpointArg)) endpoint: string,
    ): Promise<boolean> {
        return this.store.removeByEndpoint(user.userId, endpoint)
    }
}
