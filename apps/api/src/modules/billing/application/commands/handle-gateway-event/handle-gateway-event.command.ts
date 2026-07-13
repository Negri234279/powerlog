import type { GatewayEvent } from '../../ports/gateway-event'

/** A verified, translated webhook, on its way through the pipeline. */
export class HandleGatewayEventCommand {
    constructor(readonly event: GatewayEvent) {}
}
