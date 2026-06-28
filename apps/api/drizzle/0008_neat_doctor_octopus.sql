CREATE TYPE "public"."workout_status" AS ENUM('planned', 'completed');--> statement-breakpoint
CREATE TABLE "workout_exercise_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "workout_status" DEFAULT 'planned' NOT NULL,
	"performed_at" timestamp with time zone NOT NULL,
	"notes" text,
	"planned_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"order" integer NOT NULL,
	"planned_weight_kg" double precision,
	"planned_reps" integer,
	"weight_kg" double precision,
	"reps" integer,
	"rpe" double precision,
	"rir" integer,
	"e1rm_kg" double precision,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "workout_exercise_entries" ADD CONSTRAINT "workout_exercise_entries_session_id_workout_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercise_entries" ADD CONSTRAINT "workout_exercise_entries_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_entry_id_workout_exercise_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."workout_exercise_entries"("id") ON DELETE cascade ON UPDATE no action;