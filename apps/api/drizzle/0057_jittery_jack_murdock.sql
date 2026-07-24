-- `ai_plan_draft_messages` gains `position`, so the thread has a deterministic
-- order. It used to be read by `created_at`, but an athlete's request and the
-- model's answer to it are written with the same timestamp — Postgres returns
-- such ties in whatever order it likes, which can show a conversation backwards.
-- `ai_mesocycle_draft_messages` already solved this the same way.
--
-- Hand-written rather than as generated: the generated `ADD COLUMN ... NOT NULL`
-- would fail on the rows already stored. Added nullable, backfilled, then made
-- NOT NULL.
--
-- The backfill breaks ties by role: within one timestamp the athlete asked before
-- the model answered, so `user` sorts first (false < true).
ALTER TABLE "ai_plan_draft_messages" ADD COLUMN "position" integer;--> statement-breakpoint
UPDATE "ai_plan_draft_messages" AS m
SET "position" = ordered.rn - 1
FROM (
    SELECT "id",
           row_number() OVER (
               PARTITION BY "draft_id"
               ORDER BY "created_at", ("role" = 'assistant'), "id"
           ) AS rn
    FROM "ai_plan_draft_messages"
) AS ordered
WHERE m."id" = ordered."id";--> statement-breakpoint
ALTER TABLE "ai_plan_draft_messages" ALTER COLUMN "position" SET NOT NULL;--> statement-breakpoint
DROP INDEX "ai_plan_draft_messages_draft_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "ai_plan_draft_messages_draft_position" ON "ai_plan_draft_messages" USING btree ("draft_id","position");
