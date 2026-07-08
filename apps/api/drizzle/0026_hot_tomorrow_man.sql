ALTER TABLE "workout_sessions" ADD COLUMN "mesocycle_id" uuid;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN "mesocycle_week" integer;--> statement-breakpoint
CREATE INDEX "workout_sessions_mesocycle_idx" ON "workout_sessions" USING btree ("mesocycle_id","mesocycle_week");