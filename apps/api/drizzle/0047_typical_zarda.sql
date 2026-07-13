-- PayPal ids on the catalog. A plan becomes a PayPal *product*, and each price a
-- PayPal *billing plan* — and because PayPal has no coupons, an offer's trial and
-- intro cycles live INSIDE a plan, so an offer needs its own plan per price
-- (`plan_offers.paypal_plan_ids` maps our price id → that plan).
--
-- The `notification_type` values this diff also wanted are already added by
-- migration 0046 (hand-written, so drizzle's snapshot had not caught up).
-- Re-running them here would fail with "enum label already exists".
ALTER TABLE "plan_offers" ADD COLUMN "paypal_plan_ids" jsonb;--> statement-breakpoint
ALTER TABLE "plans" ADD COLUMN "paypal_product_id" text;
