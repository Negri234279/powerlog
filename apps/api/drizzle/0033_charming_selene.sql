CREATE TABLE "ai_mesocycle_draft_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"draft_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"role" "ai_plan_message_role" NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_mesocycle_drafts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"model" text NOT NULL,
	"status" "ai_plan_draft_status" DEFAULT 'open' NOT NULL,
	"weeks" integer NOT NULL,
	"training_days" integer[] NOT NULL,
	"goal" text,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_mesocycle_draft_messages" ADD CONSTRAINT "ai_mesocycle_draft_messages_draft_id_ai_mesocycle_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."ai_mesocycle_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_mesocycle_draft_messages_draft_position" ON "ai_mesocycle_draft_messages" USING btree ("draft_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_mesocycle_drafts_one_open_per_user" ON "ai_mesocycle_drafts" USING btree ("user_id") WHERE "ai_mesocycle_drafts"."status" = 'open';