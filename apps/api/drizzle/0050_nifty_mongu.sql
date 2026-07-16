CREATE TYPE "public"."set_outcome" AS ENUM('success', 'failed');--> statement-breakpoint
ALTER TABLE "workout_sets" ADD COLUMN "planned_rpe" double precision;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD COLUMN "planned_rir" integer;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD COLUMN "outcome" "set_outcome";--> statement-breakpoint
-- Until now a session set had ONE rpe/rir column doing two jobs: materializing a
-- template/mesocycle (and applying an AI plan) wrote the TARGET intensity into
-- the field meant for what the athlete actually felt. Move those targets to the
-- new planned_* columns.
--
-- A set with no weight and no reps was never performed, so its rpe/rir can only
-- ever have been a target — that alone is the test. Session status is NOT part of
-- it: a completed session can still hold sets that were programmed and never done.
UPDATE "workout_sets"
SET "planned_rpe" = "rpe",
    "planned_rir" = "rir",
    "rpe" = NULL,
    "rir" = NULL
WHERE "weight_kg" IS NULL
  AND "reps" IS NULL
  AND ("rpe" IS NOT NULL OR "rir" IS NOT NULL);