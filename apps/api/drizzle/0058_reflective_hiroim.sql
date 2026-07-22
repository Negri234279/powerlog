DROP INDEX "ai_plan_drafts_user_idx";--> statement-breakpoint
CREATE INDEX "ai_mesocycle_drafts_user_updated_idx" ON "ai_mesocycle_drafts" USING btree ("user_id","updated_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ai_plan_drafts_user_updated_idx" ON "ai_plan_drafts" USING btree ("user_id","updated_at" DESC NULLS LAST,"id" DESC NULLS LAST);