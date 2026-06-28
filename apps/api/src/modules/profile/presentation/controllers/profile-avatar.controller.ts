import {
    BadRequestException,
    Controller,
    Delete,
    Post,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Request } from 'express'

import type { AuthUser } from '../../../../auth/auth-user'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { RemoveAvatarCommand } from '../../application/commands/remove-avatar/remove-avatar.command'
import { SetAvatarCommand } from '../../application/commands/set-avatar/set-avatar.command'
import type { ProfileView } from '../../application/queries/get-my-profile/get-my-profile.handler'

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

/** The fields we use from a multer file (typed locally — global Express.Multer
 * augmentation isn't loaded under tsconfig `types: ["node"]`). */
interface UploadedImage {
    buffer: Buffer
    mimetype: string
}

/**
 * Avatar upload/removal. REST (multipart) is the sanctioned exception to
 * "everything in GraphQL": file uploads don't fit GraphQL. The image is
 * normalized to WebP server-side; the response is the updated profile view.
 */
@Controller('profile/avatar')
@UseGuards(JwtCookieGuard)
export class ProfileAvatarController {
    constructor(private readonly commandBus: CommandBus) {}

    @Post()
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
    async upload(@Req() req: Request, @UploadedFile() file?: UploadedImage): Promise<ProfileView> {
        if (!file) {
            throw new BadRequestException('No image uploaded (field "file").')
        }
        if (!ACCEPTED.includes(file.mimetype)) {
            throw new BadRequestException('Unsupported image type. Use JPEG, PNG or WebP.')
        }
        const user = req.user as AuthUser
        return this.commandBus.execute<SetAvatarCommand, ProfileView>(new SetAvatarCommand(user.userId, file.buffer))
    }

    @Delete()
    async remove(@Req() req: Request): Promise<ProfileView> {
        const user = req.user as AuthUser
        return this.commandBus.execute<RemoveAvatarCommand, ProfileView>(new RemoveAvatarCommand(user.userId))
    }
}
