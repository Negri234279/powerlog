CREATE TYPE "public"."profile_sex" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"birth_date" date,
	"sex" "profile_sex",
	"height_cm" integer,
	"bio" text,
	"avatar_key" text,
	"country" text,
	"timezone" text,
	"locale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
