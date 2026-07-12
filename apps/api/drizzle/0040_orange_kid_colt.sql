DROP INDEX "ai_mesocycle_drafts_one_open_per_user";--> statement-breakpoint
ALTER TABLE "ai_mesocycle_drafts" ADD COLUMN "athlete_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_mesocycle_drafts_one_open_per_user" ON "ai_mesocycle_drafts" USING btree ("user_id",coalesce("athlete_id", "user_id")) WHERE "ai_mesocycle_drafts"."status" = 'open';