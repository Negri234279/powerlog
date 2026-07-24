/**
 * Stripe test keys for the webhook e2e, set **at import time**.
 *
 * They cannot go in a `beforeAll`: `ConfigModule.forRoot()` runs while `AppModule`
 * is being imported (it is an argument to the `@Module` decorator), so it reads
 * and validates the environment before any hook fires. Importing this module
 * *above* the AppModule import is what makes the gateway see the keys — ESM
 * evaluates imports in the order they are declared.
 *
 * The secret key is never used to call Stripe: the e2e signs its own payloads and
 * the API only ever verifies them.
 */
export const STRIPE_TEST_WEBHOOK_SECRET = 'whsec_test_secret_for_signing_payloads'
export const STRIPE_TEST_SECRET_KEY = 'sk_test_fake_key_never_used_for_calls'

process.env['STRIPE_SECRET_KEY'] = STRIPE_TEST_SECRET_KEY
process.env['STRIPE_WEBHOOK_SECRET'] = STRIPE_TEST_WEBHOOK_SECRET
