CREATE TABLE "trial_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"audience" "plan_audience" NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_offers" ADD COLUMN "message" text;--> statement-breakpoint
CREATE UNIQUE INDEX "trial_redemptions_one_per_user_audience" ON "trial_redemptions" USING btree ("user_id","audience");