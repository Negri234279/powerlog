import { Module, type Provider } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { getToken } from '@willsoto/nestjs-prometheus'
import type { Counter, Histogram } from 'prom-client'

import type { Env } from '../../config/env'
import { METRIC } from '../../observability/metrics'
import { AuthModule } from '../auth/auth.module'
import {
    PROFILE_APPLICATION_SERVICES,
    PROFILE_COMMAND_HANDLERS,
    PROFILE_EVENT_HANDLERS,
    PROFILE_QUERY_HANDLERS,
} from './application/profile.application'
import { AvatarStorage } from './application/ports/avatar-storage.port'
import { Clock } from './application/ports/clock.port'
import { ImageProcessor } from './application/ports/image-processor.port'
import { ProfileConfig } from './application/ports/profile-config.port'
import { ProfileRepository } from './domain/repositories/profile.repository'
import { EnvProfileConfig } from './infrastructure/config/env-profile-config'
import { SharpImageProcessor } from './infrastructure/image/sharp-image-processor'
import { DrizzleProfileRepository } from './infrastructure/persistence/repositories/drizzle-profile.repository'
import { FilesystemAvatarStorage } from './infrastructure/storage/filesystem-avatar-storage'
import { R2AvatarStorage } from './infrastructure/storage/r2-avatar-storage'
import { R2HealthProbe } from './infrastructure/storage/r2-health-probe'
import { SystemClock } from './infrastructure/time/system-clock'
import { PROFILE_CONTROLLERS, PROFILE_RESOLVERS } from './presentation/profile.presentation'

/** Binds profile ports to their infrastructure adapters. */
const ADAPTERS: Provider[] = [
    { provide: Clock, useClass: SystemClock },
    { provide: ProfileRepository, useClass: DrizzleProfileRepository },
    { provide: ImageProcessor, useClass: SharpImageProcessor },
    { provide: ProfileConfig, useClass: EnvProfileConfig },
    {
        // filesystem in dev, Cloudflare R2 in prod (chosen by AVATAR_STORAGE).
        // R2 is timed, so the factory also injects its Prometheus metrics.
        provide: AvatarStorage,
        inject: [ConfigService, getToken(METRIC.r2OperationDuration), getToken(METRIC.r2BytesUploaded)],
        useFactory: (
            config: ConfigService<Env, true>,
            r2OpDuration: Histogram<string>,
            r2BytesUploaded: Counter<string>,
        ): AvatarStorage =>
            config.get('AVATAR_STORAGE', { infer: true }) === 'r2'
                ? new R2AvatarStorage(config, r2OpDuration, r2BytesUploaded)
                : new FilesystemAvatarStorage(config),
    },
    // Periodic R2 HeadBucket liveness probe → powerlog_r2_up (no-op on filesystem).
    R2HealthProbe,
]

@Module({
    // AuthModule is imported for the shared JwtCookieGuard (it carries its own
    // TokenSigner dependency). DatabaseModule (DRIZZLE) and CqrsModule are global.
    imports: [AuthModule],
    controllers: [...PROFILE_CONTROLLERS],
    providers: [
        ...ADAPTERS,
        ...PROFILE_APPLICATION_SERVICES,
        ...PROFILE_COMMAND_HANDLERS,
        ...PROFILE_QUERY_HANDLERS,
        ...PROFILE_EVENT_HANDLERS,
        ...PROFILE_RESOLVERS,
    ],
})
export class ProfileModule {}
