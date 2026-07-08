CREATE TYPE "public"."mesocycle_status" AS ENUM('draft', 'active', 'completed', 'archived');--> statement-breakpoint
CREATE TABLE "mesocycle_day_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "mesocycle_day_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_exercise_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"planned_weight_kg" double precision,
	"planned_reps" integer,
	"rpe" double precision,
	"rir" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "mesocycle_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"microcycle_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"day_offset" integer NOT NULL,
	"label" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "mesocycle_microcycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mesocycle_id" uuid NOT NULL,
	"week_index" integer NOT NULL,
	"label" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "mesocycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"goal" text,
	"start_date" date,
	"status" "mesocycle_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mesocycle_day_exercises" ADD CONSTRAINT "mesocycle_day_exercises_day_id_mesocycle_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."mesocycle_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesocycle_day_exercises" ADD CONSTRAINT "mesocycle_day_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesocycle_day_sets" ADD CONSTRAINT "mesocycle_day_sets_day_exercise_id_mesocycle_day_exercises_id_fk" FOREIGN KEY ("day_exercise_id") REFERENCES "public"."mesocycle_day_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesocycle_days" ADD CONSTRAINT "mesocycle_days_microcycle_id_mesocycle_microcycles_id_fk" FOREIGN KEY ("microcycle_id") REFERENCES "public"."mesocycle_microcycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mesocycle_microcycles" ADD CONSTRAINT "mesocycle_microcycles_mesocycle_id_mesocycles_id_fk" FOREIGN KEY ("mesocycle_id") REFERENCES "public"."mesocycles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mesocycles_owner_idx" ON "mesocycles" USING btree ("owner_id");