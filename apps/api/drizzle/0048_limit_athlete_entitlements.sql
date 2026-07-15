-- Data-only migration: athlete entitlements move from booleans (templates,
-- mesocycles) to numeric caps (maxTemplates, maxMesocycles, maxWorkouts), where
-- `null` = unlimited and `0` = none. `ai` stays a boolean. See 0043 for the seed
-- these rows started from.
--
-- Two passes: first collapse EVERY plan's old shape into the new one preserving
-- current access (a granted boolean → unlimited, a denied one → 0, and the brand-new
-- `maxWorkouts` → unlimited so nobody is suddenly blocked). Then give the free plans
-- concrete starter caps — freemium teasers the admin can retune from the panel.
--
-- Idempotent: the `WHERE ... ? 'templates'` guards skip rows already migrated, so
-- re-running is a no-op.

-- Athlete plans: transform the top-level entitlements.
UPDATE "plans"
SET "entitlements" = jsonb_build_object(
    'maxTemplates', CASE WHEN ("entitlements"->>'templates')::boolean THEN NULL ELSE 0 END,
    'maxMesocycles', CASE WHEN ("entitlements"->>'mesocycles')::boolean THEN NULL ELSE 0 END,
    'maxWorkouts', NULL,
    'ai', ("entitlements"->>'ai')::boolean
)
WHERE "audience" = 'athlete' AND "entitlements" ? 'templates';
--> statement-breakpoint

-- Coach plans: transform the nested `athlete` section (the coach's own training).
UPDATE "plans"
SET "entitlements" = jsonb_set(
    "entitlements",
    '{athlete}',
    jsonb_build_object(
        'maxTemplates', CASE WHEN ("entitlements"#>>'{athlete,templates}')::boolean THEN NULL ELSE 0 END,
        'maxMesocycles', CASE WHEN ("entitlements"#>>'{athlete,mesocycles}')::boolean THEN NULL ELSE 0 END,
        'maxWorkouts', NULL,
        'ai', ("entitlements"#>>'{athlete,ai}')::boolean
    )
)
WHERE "audience" = 'coach' AND ("entitlements"#>'{athlete}') ? 'templates';
--> statement-breakpoint

-- Free plans get starter caps so the limits are live out of the box. Adjustable
-- from the admin panel; paid plans stay unlimited (null) from the pass above.
UPDATE "plans"
SET "entitlements" = jsonb_build_object(
    'maxTemplates', 5,
    'maxMesocycles', 2,
    'maxWorkouts', 50,
    'ai', ("entitlements"->>'ai')::boolean
)
WHERE "slug" = 'athlete-free';
--> statement-breakpoint

UPDATE "plans"
SET "entitlements" = jsonb_set(
    "entitlements",
    '{athlete}',
    jsonb_build_object(
        'maxTemplates', 5,
        'maxMesocycles', 2,
        'maxWorkouts', 50,
        'ai', ("entitlements"#>>'{athlete,ai}')::boolean
    )
)
WHERE "slug" = 'coach-free';
