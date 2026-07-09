CREATE TYPE "public"."ai_plan_draft_status" AS ENUM('open', 'accepted', 'discarded');--> statement-breakpoint
CREATE TYPE "public"."ai_plan_message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TABLE "ai_plan_draft_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"draft_id" uuid NOT NULL,
	"role" "ai_plan_message_role" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_plan_draft_sets" (
	"draft_id" uuid NOT NULL,
	"set_id" uuid NOT NULL,
	"planned_weight_kg" double precision,
	"planned_reps" integer,
	"rpe" double precision,
	"rir" integer,
	"notes" text,
	CONSTRAINT "ai_plan_draft_sets_draft_id_set_id_pk" PRIMARY KEY("draft_id","set_id")
);
--> statement-breakpoint
CREATE TABLE "ai_plan_drafts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"model" text NOT NULL,
	"status" "ai_plan_draft_status" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_plan_draft_messages" ADD CONSTRAINT "ai_plan_draft_messages_draft_id_ai_plan_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."ai_plan_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_plan_draft_sets" ADD CONSTRAINT "ai_plan_draft_sets_draft_id_ai_plan_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."ai_plan_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_plan_draft_messages_draft_idx" ON "ai_plan_draft_messages" USING btree ("draft_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_plan_drafts_one_open_per_session" ON "ai_plan_drafts" USING btree ("session_id") WHERE "ai_plan_drafts"."status" = 'open';--> statement-breakpoint
CREATE INDEX "ai_plan_drafts_user_idx" ON "ai_plan_drafts" USING btree ("user_id");