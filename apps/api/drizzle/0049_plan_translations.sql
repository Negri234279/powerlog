CREATE TABLE "plan_translations" (
	"plan_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	CONSTRAINT "plan_translations_plan_id_locale_pk" PRIMARY KEY("plan_id","locale")
);
--> statement-breakpoint
ALTER TABLE "plan_translations" ADD CONSTRAINT "plan_translations_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

-- Spanish translations for the seeded catalog (0043). The English name/description
-- on each `plans` row stays the base/fallback; these localize `es`. Idempotent.
INSERT INTO "plan_translations" ("plan_id", "locale", "name", "description")
SELECT p."id", 'es', v."name", v."description"
FROM "plans" p
JOIN (VALUES
    ('athlete-free', 'Gratis', 'Registra tu entrenamiento, crea plantillas y planifica tus propios bloques.'),
    ('athlete-pro',  'Pro',    'Todo lo de Gratis, más el asistente de IA para sesiones y bloques.'),
    ('coach-free',   'Coach Gratis', 'Entrena hasta 3 atletas: planifica sus sesiones y bloques.'),
    ('coach-pro',    'Coach Pro',    'Hasta 20 atletas, con el asistente de IA para ti y para ellos.'),
    ('coach-elite',  'Coach Elite',  'Atletas ilimitados, con el asistente de IA para ti y para ellos.')
) AS v("slug", "name", "description") ON v."slug" = p."slug"
ON CONFLICT ("plan_id", "locale") DO NOTHING;