import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { Env } from '../../../../config/env'
import { BillingConfig } from '../../application/ports/billing-config.port'

@Injectable()
export class EnvBillingConfig extends BillingConfig {
    constructor(private readonly config: ConfigService<Env, true>) {
        super()
    }

    get webOrigin(): string {
        return this.config.get('WEB_ORIGIN', { infer: true })
    }

    get apiPublicUrl(): string {
        return this.config.get('API_PUBLIC_URL', { infer: true })
    }
}
