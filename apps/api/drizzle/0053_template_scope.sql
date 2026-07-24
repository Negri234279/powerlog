-- Templates gain a `scope`: personal (the owner's own training, paid by their
-- athlete plan) or coaching (built to use with athletes, paid by the coach plan).
--
-- Every existing template is personal — coaching templates are a new thing a coach
-- creates from the coach section — so the column defaults to 'personal' and the
-- backfill is the default itself. No data pass needed.

CREATE TYPE "public"."template_scope" AS ENUM('personal', 'coaching');--> statement-breakpoint

ALTER TABLE "workout_templates" ADD COLUMN "scope" "template_scope" DEFAULT 'personal' NOT NULL;
