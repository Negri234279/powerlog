import { Module, type Provider } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { Env } from '../../config/env'
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
        provide: AvatarStorage,
        inject: [ConfigService],
        useFactory: (config: ConfigService<Env, true>): AvatarStorage =>
            config.get('AVATAR_STORAGE', { infer: true }) === 'r2'
                ? new R2AvatarStorage(config)
                : new FilesystemAvatarStorage(config),
    },
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
