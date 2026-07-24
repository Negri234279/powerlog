-- Data-only migration: coach plans stop nesting the athlete section.
--
-- Athlete and coach plans become INDEPENDENT subscriptions: a coach's own
-- training is paid by an athlete plan (or the free athlete fallback), and the
-- coach plan holds nothing but coaching. So the nested `athlete` section goes,
-- and the coach shape gains its own coaching quotas:
--
--   { maxAthletes, planSessions, athlete: {...} }
--     -> { maxAthletes, planSessions, maxTemplates, maxMesocycles, ai }
--
-- The coaching quotas carry over the values the nested section had — the numbers
-- the plan already promised, now read at coaching scope (coach-free keeps starter
-- caps, paid plans stay unlimited). `ai` carries over too: a plan that included
-- the assistant keeps it, now scoped to designing for athletes. All retunable
-- from /admin/plans, which renders its form from the new zod shape by itself.
--
-- Idempotent: the `entitlements ? 'athlete'` guard skips rows already migrated.

UPDATE "plans"
SET "entitlements" = jsonb_build_object(
    'maxAthletes', "entitlements"->'maxAthletes',
    'planSessions', "entitlements"->'planSessions',
    'maxTemplates', "entitlements"#>'{athlete,maxTemplates}',
    'maxMesocycles', "entitlements"#>'{athlete,maxMesocycles}',
    'ai', "entitlements"#>'{athlete,ai}'
)
WHERE "audience" = 'coach' AND "entitlements" ? 'athlete';
