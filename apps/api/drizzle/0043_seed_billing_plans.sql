-- Data-only migration: the starting catalog.
--
-- Every user resolves to a plan from day one: with no subscription row they fall
-- back to the free plan of their audience, so these rows are what makes the
-- entitlement checks answerable at all. Archiving the last free plan of an
-- audience is refused for the same reason.
--
-- The paid plans are born `active` but WITHOUT gateway ids: syncing the catalog
-- to Stripe/PayPal is an admin action (9.3/9.4) that needs API keys — a migration
-- must never call an external service.
--
-- Idempotent (ON CONFLICT DO NOTHING, keyed by slug and by the active-price
-- index), so re-running it on a DB that already has the catalog is a no-op.
--
-- Prices are a starting point, not a decision: a price is IMMUTABLE per version,
-- so changing one means deactivating its row and inserting another — never an
-- UPDATE, or live subscriptions would silently re-bill.

INSERT INTO "plans" ("audience", "slug", "name", "description", "status", "is_free", "sort_order", "entitlements")
VALUES
    (
        'athlete', 'athlete-free', 'Free',
        'Log your training, build templates and plan your own blocks.',
        'active', true, 0,
        '{"templates": true, "mesocycles": true, "ai": false}'::jsonb
    ),
    (
        'athlete', 'athlete-pro', 'Pro',
        'Everything in Free, plus the AI assistant for sessions and blocks.',
        'active', false, 1,
        '{"templates": true, "mesocycles": true, "ai": true}'::jsonb
    ),
    (
        'coach', 'coach-free', 'Coach Free',
        'Coach up to 3 athletes: plan their sessions and blocks.',
        'active', true, 0,
        '{"maxAthletes": 3, "planSessions": true, "athlete": {"templates": true, "mesocycles": true, "ai": false}}'::jsonb
    ),
    (
        'coach', 'coach-pro', 'Coach Pro',
        'Up to 20 athletes, with the AI assistant for you and for them.',
        'active', false, 1,
        '{"maxAthletes": 20, "planSessions": true, "athlete": {"templates": true, "mesocycles": true, "ai": true}}'::jsonb
    ),
    (
        'coach', 'coach-elite', 'Coach Elite',
        'Unlimited athletes, with the AI assistant for you and for them.',
        'active', false, 2,
        '{"maxAthletes": null, "planSessions": true, "athlete": {"templates": true, "mesocycles": true, "ai": true}}'::jsonb
    )
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
INSERT INTO "plan_prices" ("plan_id", "interval", "currency", "amount_cents")
SELECT p."id", v."interval"::"plan_interval", v."currency"::"currency", v."amount_cents"
FROM "plans" p
JOIN (VALUES
    -- Yearly is priced at ten months: two months free is what makes the annual
    -- commitment worth offering.
    ('athlete-pro',  'month', 'EUR',   799),
    ('athlete-pro',  'year',  'EUR',  7990),
    ('athlete-pro',  'month', 'USD',   899),
    ('athlete-pro',  'year',  'USD',  8990),
    ('coach-pro',    'month', 'EUR',  1999),
    ('coach-pro',    'year',  'EUR', 19990),
    ('coach-pro',    'month', 'USD',  2199),
    ('coach-pro',    'year',  'USD', 21990),
    ('coach-elite',  'month', 'EUR',  3999),
    ('coach-elite',  'year',  'EUR', 39990),
    ('coach-elite',  'month', 'USD',  4399),
    ('coach-elite',  'year',  'USD', 43990)
) AS v("slug", "interval", "currency", "amount_cents") ON v."slug" = p."slug"
ON CONFLICT ("plan_id", "interval", "currency") WHERE "active" DO NOTHING;
