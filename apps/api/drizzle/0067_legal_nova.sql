ALTER TABLE "chat_participant_state" ADD COLUMN "cleared_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chat_participant_state" ADD COLUMN "hidden_at" timestamp with time zone;