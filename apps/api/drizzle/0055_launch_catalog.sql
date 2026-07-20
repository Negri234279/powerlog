-- Data-only migration: the LAUNCH catalog — the plans prod actually goes live with.
--
-- Up to here the catalog came from the 0043 seed and its later transforms. This
-- migration replaces it wholesale with a symmetric 3-tier ladder on both
-- audiences (Free / Pro / Elite), reduced launch pricing and an intro offer on
-- every paid plan. Prod has never had plans; the old rows only ever existed in
-- dev — so here we archive them and stand up the real catalog on top.
--
-- Order matters and is deliberate:
--   1) Rename the old seeded plans to `<slug>-legacy` and archive them. Archiving
--      frees the "one active free per audience" unique index so the new free plans
--      can be inserted, and it keeps the rows around: any subscription still points
--      at them by id (entitlements resolve by plan id, not by status), and the
--      admin panel keeps the history.
--   2) Insert the new catalog under the clean canonical slugs, then its prices,
--      offers and Spanish translations.
--
-- The paid plans are born `active` but WITHOUT gateway ids: publishing them to
-- Stripe/PayPal — which is what actually creates the trial + intro coupon — is an
-- admin action (/admin/plans → Sync). A migration must never call an external API.
--
-- Idempotent:
--   - the rename guards on `NOT EXISTS(<slug>-legacy)`, so a second run neither
--     re-renames the old rows nor ever touches the new ones (they carry the clean
--     slugs the WHERE lists, but their `-legacy` twin already exists);
--   - every INSERT is ON CONFLICT DO NOTHING, keyed by slug / the active-price
--     index / the active-offer index / the (plan, locale) key.
--
-- Prices are a starting point, not a decision: a price is IMMUTABLE per version,
-- so changing one later means deactivating its row and inserting another — never
-- an UPDATE, or live subscriptions would silently re-bill.

-- 1) Archive the old seeded catalog, renaming it out of the way.
UPDATE "plans" AS p
SET "slug" = p."slug" || '-legacy', "status" = 'archived', "updated_at" = now()
WHERE p."slug" IN ('athlete-free', 'athlete-pro', 'coach-free', 'coach-pro', 'coach-elite')
  AND NOT EXISTS (SELECT 1 FROM "plans" l WHERE l."slug" = p."slug" || '-legacy');
--> statement-breakpoint

-- 2) The new catalog. Free plans are intentionally restrictive but usable — enough
--    for an athlete or a coach to try the product; the paid tiers open up.
INSERT INTO "plans" ("audience", "slug", "name", "description", "status", "is_free", "sort_order", "entitlements")
VALUES
    (
        'athlete', 'athlete-free', 'Free',
        'Log your training, build templates and plan your own blocks — free forever.',
        'active', true, 0,
        '{"maxTemplates": 3, "maxMesocycles": 1, "maxWorkouts": 30, "ai": false}'::jsonb
    ),
    (
        'athlete', 'athlete-pro', 'Pro',
        'Serious training: generous limits and the AI assistant that drafts your sessions and blocks.',
        'active', false, 1,
        '{"maxTemplates": 60, "maxMesocycles": 24, "maxWorkouts": null, "ai": true}'::jsonb
    ),
    (
        'athlete', 'athlete-elite', 'Elite',
        'No limits. Everything unlimited, with the full AI assistant behind every session.',
        'active', false, 2,
        '{"maxTemplates": null, "maxMesocycles": null, "maxWorkouts": null, "ai": true}'::jsonb
    ),
    (
        'coach', 'coach-free', 'Coach Free',
        'Start coaching: take up to 3 athletes and plan their sessions and blocks.',
        'active', true, 0,
        '{"maxAthletes": 3, "planSessions": true, "maxTemplates": 3, "maxMesocycles": 1, "ai": false}'::jsonb
    ),
    (
        'coach', 'coach-pro', 'Coach Pro',
        'Grow your roster: up to 30 athletes with the AI assistant for you and for them.',
        'active', false, 1,
        '{"maxAthletes": 30, "planSessions": true, "maxTemplates": 100, "maxMesocycles": 60, "ai": true}'::jsonb
    ),
    (
        'coach', 'coach-elite', 'Coach Elite',
        'Unlimited athletes and no limits, with the full AI assistant for your whole roster.',
        'active', false, 2,
        '{"maxAthletes": null, "planSessions": true, "maxTemplates": null, "maxMesocycles": null, "ai": true}'::jsonb
    )
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint

-- 3) Reduced launch pricing. Yearly is priced at ten months (two months free is
--    what makes the annual commitment worth offering).
INSERT INTO "plan_prices" ("plan_id", "interval", "currency", "amount_cents")
SELECT p."id", v."interval"::"plan_interval", v."currency"::"currency", v."amount_cents"
FROM "plans" p
JOIN (VALUES
    ('athlete-pro',   'month', 'EUR',   499),
    ('athlete-pro',   'year',  'EUR',  4990),
    ('athlete-pro',   'month', 'USD',   549),
    ('athlete-pro',   'year',  'USD',  5490),
    ('athlete-elite', 'month', 'EUR',   799),
    ('athlete-elite', 'year',  'EUR',  7990),
    ('athlete-elite', 'month', 'USD',   899),
    ('athlete-elite', 'year',  'USD',  8990),
    ('coach-pro',     'month', 'EUR',  1299),
    ('coach-pro',     'year',  'EUR', 12990),
    ('coach-pro',     'month', 'USD',  1399),
    ('coach-pro',     'year',  'USD', 13990),
    ('coach-elite',   'month', 'EUR',  2499),
    ('coach-elite',   'year',  'EUR', 24990),
    ('coach-elite',   'month', 'USD',  2799),
    ('coach-elite',   'year',  'USD', 27990)
) AS v("slug", "interval", "currency", "amount_cents") ON v."slug" = p."slug" AND p."status" = 'active'
ON CONFLICT ("plan_id", "interval", "currency") WHERE "active" DO NOTHING;
--> statement-breakpoint

-- 4) Launch offers: a free trial plus a discounted opening phase on every paid
--    plan. Open-ended (`ends_at` null) — retire them from /admin/plans when the
--    launch window closes. They only bite once published to the gateways (Stripe
--    coupon / PayPal plans), which is the admin Sync action.
INSERT INTO "plan_offers" ("plan_id", "name", "message", "trial_days", "intro_phase", "starts_at")
SELECT p."id", v."name", v."message", v."trial_days", v."intro_phase"::jsonb, now()
FROM "plans" p
JOIN (VALUES
    ('athlete-pro',   'Lanzamiento', '14 días gratis, luego 50 % los 3 primeros meses', 14, '{"cycles": 3, "percentOff": 50}'),
    ('athlete-elite', 'Lanzamiento', '14 días gratis, luego 50 % los 3 primeros meses', 14, '{"cycles": 3, "percentOff": 50}'),
    ('coach-pro',     'Lanzamiento', '14 días gratis, luego 50 % los 3 primeros meses', 14, '{"cycles": 3, "percentOff": 50}'),
    ('coach-elite',   'Lanzamiento', '14 días gratis, luego 40 % los 3 primeros meses', 14, '{"cycles": 3, "percentOff": 40}')
) AS v("slug", "name", "message", "trial_days", "intro_phase") ON v."slug" = p."slug" AND p."status" = 'active'
ON CONFLICT ("plan_id") WHERE "active" DO NOTHING;
--> statement-breakpoint

-- 5) Spanish translations. The English name/description on each row stays the
--    base/fallback; these localize `es`.
INSERT INTO "plan_translations" ("plan_id", "locale", "name", "description")
SELECT p."id", 'es', v."name", v."description"
FROM "plans" p
JOIN (VALUES
    ('athlete-free',  'Gratis',       'Registra tu entrenamiento, crea plantillas y planifica tus propios bloques — gratis para siempre.'),
    ('athlete-pro',   'Pro',          'Entrena en serio: límites generosos y el asistente de IA que redacta tus sesiones y bloques.'),
    ('athlete-elite', 'Elite',        'Sin límites. Todo ilimitado, con el asistente de IA completo detrás de cada sesión.'),
    ('coach-free',    'Coach Gratis', 'Empieza a entrenar: hasta 3 atletas y planifica sus sesiones y bloques.'),
    ('coach-pro',     'Coach Pro',    'Haz crecer tu roster: hasta 30 atletas con el asistente de IA para ti y para ellos.'),
    ('coach-elite',   'Coach Elite',  'Atletas ilimitados y sin límites, con el asistente de IA completo para todo tu roster.')
) AS v("slug", "name", "description") ON v."slug" = p."slug" AND p."status" = 'active'
ON CONFLICT ("plan_id", "locale") DO NOTHING;
