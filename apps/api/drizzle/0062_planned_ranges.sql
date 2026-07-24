-- Planned targets become ranges: a coach can programme "50-55 kg × 5-8 @ 1-2 RIR"
-- instead of a single number per field. Each target is stored as its two bounds.
--
-- The existing column becomes the lower bound (a plain rename, so no data moves)
-- and a new `_max` column is added and backfilled from it. Every set already in
-- the database therefore becomes a range whose bounds coincide — which is exactly
-- what a single value means here — and nothing reads differently than it did.
--
-- Performed values (`weight_kg`, `reps`, `rpe`, `rir` on `workout_sets`) are left
-- alone on purpose: you lifted what you lifted.

-- ── templates ────────────────────────────────────────────────────────────
ALTER TABLE "workout_template_sets" RENAME COLUMN "planned_weight_kg" TO "planned_weight_kg_min";--> statement-breakpoint
ALTER TABLE "workout_template_sets" RENAME COLUMN "planned_reps" TO "planned_reps_min";--> statement-breakpoint
ALTER TABLE "workout_template_sets" RENAME COLUMN "rpe" TO "rpe_min";--> statement-breakpoint
ALTER TABLE "workout_template_sets" RENAME COLUMN "rir" TO "rir_min";--> statement-breakpoint
ALTER TABLE "workout_template_sets" ADD COLUMN "planned_weight_kg_max" double precision;--> statement-breakpoint
ALTER TABLE "workout_template_sets" ADD COLUMN "planned_reps_max" integer;--> statement-breakpoint
ALTER TABLE "workout_template_sets" ADD COLUMN "rpe_max" double precision;--> statement-breakpoint
ALTER TABLE "workout_template_sets" ADD COLUMN "rir_max" integer;--> statement-breakpoint
UPDATE "workout_template_sets" SET
    "planned_weight_kg_max" = "planned_weight_kg_min",
    "planned_reps_max" = "planned_reps_min",
    "rpe_max" = "rpe_min",
    "rir_max" = "rir_min";--> statement-breakpoint

-- ── mesocycle days ───────────────────────────────────────────────────────
ALTER TABLE "mesocycle_day_sets" RENAME COLUMN "planned_weight_kg" TO "planned_weight_kg_min";--> statement-breakpoint
ALTER TABLE "mesocycle_day_sets" RENAME COLUMN "planned_reps" TO "planned_reps_min";--> statement-breakpoint
ALTER TABLE "mesocycle_day_sets" RENAME COLUMN "rpe" TO "rpe_min";--> statement-breakpoint
ALTER TABLE "mesocycle_day_sets" RENAME COLUMN "rir" TO "rir_min";--> statement-breakpoint
ALTER TABLE "mesocycle_day_sets" ADD COLUMN "planned_weight_kg_max" double precision;--> statement-breakpoint
ALTER TABLE "mesocycle_day_sets" ADD COLUMN "planned_reps_max" integer;--> statement-breakpoint
ALTER TABLE "mesocycle_day_sets" ADD COLUMN "rpe_max" double precision;--> statement-breakpoint
ALTER TABLE "mesocycle_day_sets" ADD COLUMN "rir_max" integer;--> statement-breakpoint
UPDATE "mesocycle_day_sets" SET
    "planned_weight_kg_max" = "planned_weight_kg_min",
    "planned_reps_max" = "planned_reps_min",
    "rpe_max" = "rpe_min",
    "rir_max" = "rir_min";--> statement-breakpoint

-- ── session sets (the planned half only) ─────────────────────────────────
ALTER TABLE "workout_sets" RENAME COLUMN "planned_weight_kg" TO "planned_weight_kg_min";--> statement-breakpoint
ALTER TABLE "workout_sets" RENAME COLUMN "planned_reps" TO "planned_reps_min";--> statement-breakpoint
ALTER TABLE "workout_sets" RENAME COLUMN "planned_rpe" TO "planned_rpe_min";--> statement-breakpoint
ALTER TABLE "workout_sets" RENAME COLUMN "planned_rir" TO "planned_rir_min";--> statement-breakpoint
ALTER TABLE "workout_sets" ADD COLUMN "planned_weight_kg_max" double precision;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD COLUMN "planned_reps_max" integer;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD COLUMN "planned_rpe_max" double precision;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD COLUMN "planned_rir_max" integer;--> statement-breakpoint
UPDATE "workout_sets" SET
    "planned_weight_kg_max" = "planned_weight_kg_min",
    "planned_reps_max" = "planned_reps_min",
    "planned_rpe_max" = "planned_rpe_min",
    "planned_rir_max" = "planned_rir_min";
