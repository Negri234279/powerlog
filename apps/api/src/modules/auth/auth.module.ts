import { Module, type Provider } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportModule } from '@nestjs/passport'

import { AdminGuard } from '../../auth/admin.guard'
import { JwtCookieGuard } from '../../auth/jwt-cookie.guard'
import type { Env } from '../../config/env'
import { PresenceReadModule } from '../../presence/presence-read.module'
import { QueryBusProfileSnapshotReader } from '../../account/query-bus-profile-snapshot-reader'
import { QueryBusUserBillingReader } from '../../admin-user-detail/query-bus-user-billing-reader'
import { QueryBusUserCoachingReader } from '../../admin-user-detail/query-bus-user-coaching-reader'
import { QueryBusUserTrainingReader } from '../../admin-user-detail/query-bus-user-training-reader'
import { CommandBusProfileProvisioner } from '../../registration/command-bus-profile-provisioner'
import { ProfileProvisioner } from '../../shared/contracts/profile-provisioner'
import { ProfileSnapshotReader } from '../../shared/contracts/profile-snapshot-reader'
import { UserBillingReader } from '../../shared/contracts/user-billing'
import { UserCoachingReader } from '../../shared/contracts/user-coaching'
import { UserTrainingReader } from '../../shared/contracts/user-training'
import { UserDirectory } from '../../shared/contracts/user-directory'
import {
    AUTH_APPLICATION_SERVICES,
    AUTH_COMMAND_HANDLERS,
    AUTH_EVENT_HANDLERS,
    AUTH_QUERY_HANDLERS,
} from './application/auth.application'
import { AuthConfig } from './application/ports/auth-config.port'
import { AuthMetrics } from './application/ports/auth-metrics.port'
import { Clock } from './application/ports/clock.port'
import { IdGenerator } from './application/ports/id-generator.port'
import { OpaqueTokenGenerator } from './application/ports/opaque-token-generator.port'
import { PasswordHasher } from './application/ports/password-hasher.port'
import { RefreshTokenGenerator } from './application/ports/refresh-token-generator.port'
import { TokenSigner } from './application/ports/token-signer.port'
import { EmailVerificationTokenRepository } from './domain/repositories/email-verification-token.repository'
import { PasswordResetTokenRepository } from './domain/repositories/password-reset-token.repository'
import { RefreshTokenRepository } from './domain/repositories/refresh-token.repository'
import { UserRepository } from './domain/repositories/user.repository'
import { AdminUserReadModel } from './application/ports/admin-user.read-model'
import { EnvAuthConfig } from './infrastructure/config/env-auth-config'
import { Argon2PasswordHasher } from './infrastructure/crypto/argon2-password-hasher'
import { Sha256RefreshTokenGenerator } from './infrastructure/crypto/sha256-refresh-token-generator'
import { Sha256TokenGenerator } from './infrastructure/crypto/sha256-token-generator'
import { AuthUserDirectory } from './infrastructure/directory/auth-user-directory'
import { UuidGenerator } from './infrastructure/id/uuid-generator'
import { JoseTokenSigner } from './infrastructure/jwt/jose-token-signer'
import { PrometheusAuthMetrics } from './infrastructure/metrics/prometheus-auth-metrics'
import { GoogleStrategy } from './infrastructure/oauth/google.strategy'
import { DrizzleEmailVerificationTokenRepository } from './infrastructure/persistence/repositories/drizzle-email-verification-token.repository'
import { DrizzlePasswordResetTokenRepository } from './infrastructure/persistence/repositories/drizzle-password-reset-token.repository'
import { DrizzleAdminUserReadModel } from './infrastructure/persistence/read-models/drizzle-admin-user.read-model'
import { DrizzleRefreshTokenRepository } from './infrastructure/persistence/repositories/drizzle-refresh-token.repository'
import { DrizzleUserRepository } from './infrastructure/persistence/repositories/drizzle-user.repository'
import { SystemClock } from './infrastructure/time/system-clock'
import { AUTH_PRESENTATION_PROVIDERS, AUTH_RESOLVERS } from './presentation/auth.presentation'
import { GoogleOAuthController } from './presentation/controllers/google-oauth.controller'

/** Binds each application/domain port to its infrastructure adapter. */
const ADAPTERS: Provider[] = [
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: TokenSigner, useClass: JoseTokenSigner },
    { provide: RefreshTokenGenerator, useClass: Sha256RefreshTokenGenerator },
    { provide: Clock, useClass: SystemClock },
    { provide: AuthMetrics, useClass: PrometheusAuthMetrics },
    { provide: IdGenerator, useClass: UuidGenerator },
    { provide: AuthConfig, useClass: EnvAuthConfig },
    { provide: UserRepository, useClass: DrizzleUserRepository },
    { provide: RefreshTokenRepository, useClass: DrizzleRefreshTokenRepository },
    { provide: OpaqueTokenGenerator, useClass: Sha256TokenGenerator },
    { provide: EmailVerificationTokenRepository, useClass: DrizzleEmailVerificationTokenRepository },
    { provide: PasswordResetTokenRepository, useClass: DrizzlePasswordResetTokenRepository },
    { provide: AdminUserReadModel, useClass: DrizzleAdminUserReadModel },
    // Cross-module port: lets other modules resolve users without importing auth.
    { provide: UserDirectory, useClass: AuthUserDirectory },
    // Cross-module port: provisions the profile during registration via the
    // CommandBus (so the register flow can roll back if it fails).
    { provide: ProfileProvisioner, useClass: CommandBusProfileProvisioner },
    // Cross-module port: reads the profile snapshot (handle + avatar) the
    // SessionIssuer stamps into the JWT, via the QueryBus.
    { provide: ProfileSnapshotReader, useClass: QueryBusProfileSnapshotReader },
    // Cross-module ports for the admin user detail: billing (subscriptions + MRR),
    // coaching (coach/athlete links) and workouts (training figures), each asked
    // over the QueryBus so auth imports none of those modules.
    { provide: UserBillingReader, useClass: QueryBusUserBillingReader },
    { provide: UserCoachingReader, useClass: QueryBusUserCoachingReader },
    { provide: UserTrainingReader, useClass: QueryBusUserTrainingReader },
]

/**
 * GoogleStrategy registers itself with passport on construction and throws if
 * clientID is empty. Only instantiate it when Google is configured, so the API
 * still boots without Google credentials (the /auth/google routes 500 instead).
 */
const GOOGLE_STRATEGY: Provider = {
    provide: GoogleStrategy,
    inject: [ConfigService],
    useFactory: (config: ConfigService<Env, true>): GoogleStrategy | null =>
        config.get('GOOGLE_CLIENT_ID', { infer: true }) ? new GoogleStrategy(config) : null,
}

@Module({
    // PresenceReadModule → PresenceReader for the admin user detail (isOnline +
    // real last-seen). It depends only on globals, so no cycle with auth.
    imports: [PassportModule, PresenceReadModule],
    controllers: [GoogleOAuthController],
    providers: [
        ...ADAPTERS,
        ...AUTH_APPLICATION_SERVICES,
        ...AUTH_COMMAND_HANDLERS,
        ...AUTH_QUERY_HANDLERS,
        ...AUTH_EVENT_HANDLERS,
        ...AUTH_RESOLVERS,
        ...AUTH_PRESENTATION_PROVIDERS,
        GOOGLE_STRATEGY,
        JwtCookieGuard,
        AdminGuard,
    ],
    // Exported so other feature modules can guard their resolvers with the same
    // cookie auth. TokenSigner is exported too: @UseGuards instantiates the guard
    // in the consuming module's scope, so its dependency must be resolvable there
    // (ConfigService and ClsService are already global).
    exports: [JwtCookieGuard, TokenSigner, UserDirectory],
})
export class AuthModule {}
