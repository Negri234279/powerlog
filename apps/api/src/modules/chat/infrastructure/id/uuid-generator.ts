import { randomUUID } from 'node:crypto'

import { Injectable } from '@nestjs/common'

import { IdGenerator } from '../../application/ports/id-generator.port'

@Injectable()
export class UuidGenerator extends IdGenerator {
    uuid(): string {
        return randomUUID()
    }
}
