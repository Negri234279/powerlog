import { GatewayRequestFailedError } from '../../domain/errors/billing.errors'

/**
 * A thin REST client for the PayPal APIs we use.
 *
 * **Why not the official SDK.** `@paypal/paypal-server-sdk` is alive and does
 * cover subscriptions — but it covers **neither** of the two other things we need:
 * creating the catalog product (`/v1/catalogs/products`) and, crucially,
 * **verifying a webhook** (PayPal authenticates an event by an API call, and that
 * endpoint is not in the SDK). Since `fetch` is unavoidable anyway, pulling in
 * 4.3 MB of axios/apimatic for six endpoints buys nothing.
 *
 * The access token is cached until shortly before it expires: every call needs
 * one, and asking for a new one per request would double the traffic to PayPal.
 */
export class PayPalClient {
    private token: { value: string; expiresAt: number } | null = null

    constructor(
        private readonly baseUrl: string,
        private readonly clientId: string,
        private readonly clientSecret: string,
    ) {}

    async get<T>(path: string): Promise<T> {
        return this.request<T>('GET', path)
    }

    async post<T>(path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
        return this.request<T>('POST', path, body, headers)
    }

    async patch<T>(path: string, body: unknown): Promise<T> {
        return this.request<T>('PATCH', path, body)
    }

    private async request<T>(
        method: string,
        path: string,
        body?: unknown,
        headers: Record<string, string> = {},
    ): Promise<T> {
        const response = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers: {
                authorization: `Bearer ${await this.accessToken()}`,
                'content-type': 'application/json',
                ...headers,
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        })

        if (!response.ok) {
            // PayPal answers errors as JSON with a `message` and `details`; the body is
            // the only thing that says WHICH field it disliked, so it is worth reading.
            const detail = await response.text().catch(() => '')
            throw new GatewayRequestFailedError('paypal', `${response.status} ${detail.slice(0, 300)}`)
        }

        // 204s (cancel, activate, suspend) have no body.
        if (response.status === 204) return undefined as T

        return (await response.json()) as T
    }

    private async accessToken(): Promise<string> {
        // A minute of slack: a token that expires mid-flight is a failed payment.
        if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value

        const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
        const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                authorization: `Basic ${basic}`,
                'content-type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        })

        if (!response.ok) {
            throw new GatewayRequestFailedError('paypal', `auth failed (${response.status})`)
        }

        const json = (await response.json()) as { access_token: string; expires_in: number }
        this.token = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }

        return this.token.value
    }
}
