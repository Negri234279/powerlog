ALTER TYPE "public"."notification_type" ADD VALUE 'coach_linked';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'athlete_linked';--> statement-breakpoint
ALTER TABLE "coach_athlete_invitations" ALTER COLUMN "athlete_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "coach_athlete_invitations" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
CREATE INDEX "coach_invitations_email_idx" ON "coach_athlete_invitations" USING btree ("email");