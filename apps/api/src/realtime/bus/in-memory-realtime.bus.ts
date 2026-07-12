import { Injectable, type OnApplicationShutdown } from '@nestjs/common'
import { Observable, Subject } from 'rxjs'

import { RealtimeBus, type RealtimeMessage } from '../realtime.bus'

/**
 * Single-process fan-out: a message goes straight to the streams held by *this*
 * instance. Used when `REDIS_URL` is unset (local dev without Docker, tests) and
 * as the honest description of a one-instance deployment.
 */
@Injectable()
export class InMemoryRealtimeBus extends RealtimeBus implements OnApplicationShutdown {
    private readonly subject = new Subject<RealtimeMessage>()

    readonly messages$: Observable<RealtimeMessage> = this.subject.asObservable()

    publish(message: RealtimeMessage): void {
        this.subject.next(message)
    }

    onApplicationShutdown(): void {
        this.subject.complete()
    }
}
