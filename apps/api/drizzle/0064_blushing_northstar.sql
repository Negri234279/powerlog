CREATE TYPE "public"."chat_message_kind" AS ENUM('text');--> statement-breakpoint
CREATE TABLE "chat_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coach_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_conversation_pair_unique" UNIQUE("coach_id","athlete_id")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"kind" "chat_message_kind" DEFAULT 'text' NOT NULL,
	"body" text NOT NULL,
	"attachment_url" text,
	"attachment_mime" text,
	"attachment_size" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_participant_state" (
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"last_delivered_message_id" uuid,
	"last_read_message_id" uuid,
	"last_read_at" timestamp with time zone,
	CONSTRAINT "chat_participant_state_conversation_id_user_id_pk" PRIMARY KEY("conversation_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_participant_state" ADD CONSTRAINT "chat_participant_state_conversation_id_chat_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_messages_cursor_idx" ON "chat_messages" USING btree ("conversation_id","created_at","id");--> statement-breakpoint
-- Backfill: every coach↔athlete link that predates chat gets its conversation, so
-- listChat* never meets a linked pair without one. Idempotent via the pair unique;
-- the conversation inherits the link's own start date. New links are covered by
-- CreateConversationOnCoachLinkEstablished.
INSERT INTO "chat_conversations" ("coach_id", "athlete_id", "created_at")
SELECT "coach_id", "athlete_id", "created_at" FROM "coach_athlete"
ON CONFLICT ("coach_id", "athlete_id") DO NOTHING;