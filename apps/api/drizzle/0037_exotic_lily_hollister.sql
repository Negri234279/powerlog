ALTER TABLE "coach_athlete_invitations" ADD COLUMN "token_hash" text;--> statement-breakpoint
CREATE INDEX "coach_invitations_token_hash_idx" ON "coach_athlete_invitations" USING btree ("token_hash");