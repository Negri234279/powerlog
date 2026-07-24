-- Subscriptions gain an `audience`, denormalised from their plan, and the
-- "one live subscription per user" rule becomes "one per (user, audience)".
--
-- Why: athlete and coach plans are now independent subscriptions — a coach may
-- hold one of each at the same time. The partial unique index cannot join to
-- `plans`, so the audience has to live on the subscription row.
--
-- Immutable per subscription: a plan change stays within an audience (switching
-- athlete-pro → athlete-elite, never athlete → coach), so there is no path that
-- rewrites this column after the backfill.
--
-- Safe on existing data: before this, a user had at most ONE live subscription,
-- so every row backfills to exactly one audience and the new (user, audience)
-- index is satisfied with room to spare.

ALTER TABLE "subscriptions" ADD COLUMN "audience" "plan_audience";--> statement-breakpoint

UPDATE "subscriptions" s
SET "audience" = p."audience"
FROM "plans" p
WHERE s."plan_id" = p."id" AND s."audience" IS NULL;--> statement-breakpoint

ALTER TABLE "subscriptions" ALTER COLUMN "audience" SET NOT NULL;--> statement-breakpoint

DROP INDEX "subscriptions_one_live_per_user";--> statement-breakpoint

CREATE UNIQUE INDEX "subscriptions_one_live_per_user_audience"
ON "subscriptions" USING btree ("user_id", "audience")
WHERE "subscriptions"."status" IN ('incomplete', 'trialing', 'active', 'past_due', 'canceled');
