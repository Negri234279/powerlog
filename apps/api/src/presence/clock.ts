import { Injectable } from '@nestjs/common'

/** Abstracts the current time so presence transitions stay testable. */
export abstract class Clock {
    abstract now(): Date
}

@Injectable()
export class SystemClock extends Clock {
    now(): Date {
        return new Date()
    }
}
