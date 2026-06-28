import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { type Profile, Strategy, type VerifyCallback } from 'passport-google-oauth20'

import type { Env } from '../../../../config/env'
import type { GoogleProfile } from '../../application/commands/login-with-google/google-profile'

/**
 * Google OAuth (authorization-code flow). Passport exchanges the code, then
 * `validate` distills the profile into a `GoogleProfile` that the OAuth
 * controller turns into a LoginWithGoogleCommand. Registered only when Google
 * credentials are configured (see AuthModule).
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(config: ConfigService<Env, true>) {
        super({
            clientID: config.get('GOOGLE_CLIENT_ID', { infer: true }),
            clientSecret: config.get('GOOGLE_CLIENT_SECRET', { infer: true }),
            callbackURL: config.get('GOOGLE_CALLBACK_URL', { infer: true }),
            scope: ['email', 'profile'],
        })
    }

    validate(_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback): void {
        const email = profile.emails?.[0]?.value
        if (!email) {
            done(new Error('Google account did not provide an email.'), false)
            return
        }

        const user: GoogleProfile = {
            googleId: profile.id,
            email,
            displayName: profile.displayName || undefined,
            firstName: profile.name?.givenName || undefined,
            lastName: profile.name?.familyName || undefined,
            pictureUrl: profile.photos?.[0]?.value || undefined,
        }

        done(null, user)
    }
}
