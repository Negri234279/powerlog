import { Controller, Get, Param, Res } from '@nestjs/common'
import type { Response } from 'express'

import { AvatarStorage } from '../../application/ports/avatar-storage.port'

/**
 * Serves avatar bytes (used by the filesystem storage in dev; in prod `urlFor`
 * points at R2's public URL, so this route isn't hit). Public — avatars aren't
 * secret and the key is an opaque per-user filename.
 */
@Controller('avatars')
export class AvatarFileController {
    constructor(private readonly storage: AvatarStorage) {}

    @Get(':key')
    async serve(@Param('key') key: string, @Res() res: Response): Promise<void> {
        const object = await this.storage.read(key)
        if (!object) {
            res.status(404).end()
            return
        }
        res.setHeader('Content-Type', object.contentType)
        res.setHeader('Cache-Control', 'public, max-age=3600')
        res.end(object.bytes)
    }
}
