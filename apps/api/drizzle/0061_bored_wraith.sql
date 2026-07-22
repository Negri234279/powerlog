CREATE TYPE "public"."ai_generation_kind" AS ENUM('session_plan', 'session_plan_refinement', 'mesocycle', 'mesocycle_refinement');--> statement-breakpoint
CREATE TYPE "public"."ai_generation_status" AS ENUM('queued', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "ai_generations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "ai_generation_kind" NOT NULL,
	"status" "ai_generation_status" DEFAULT 'queued' NOT NULL,
	"request" jsonb NOT NULL,
	"draft_id" uuid,
	"failure_code" text,
	"scope_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ai_generations_one_in_flight_per_scope" ON "ai_generations" USING btree ("scope_key") WHERE "ai_generations"."status" in ('queued', 'running');--> statement-breakpoint
CREATE INDEX "ai_generations_user_created_idx" ON "ai_generations" USING btree ("user_id","created_at" DESC NULLS LAST,"id" DESC NULLS LAST);