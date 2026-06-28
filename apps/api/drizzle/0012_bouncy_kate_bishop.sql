CREATE TYPE "public"."account_status" AS ENUM('active', 'disabled', 'deleted');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" "account_status" DEFAULT 'active' NOT NULL;