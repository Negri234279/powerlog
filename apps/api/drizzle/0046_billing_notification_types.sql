-- The bell learns to talk about money: activation, cancellation and a failed card.
-- `ALTER TYPE ... ADD VALUE` is how a pgEnum grows; it cannot run inside a
-- transaction block in older Postgres, but drizzle runs each statement on its own.
ALTER TYPE "public"."notification_type" ADD VALUE 'subscription_activated';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'subscription_canceled';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'subscription_payment_failed';
