CREATE TYPE "public"."ai_provider" AS ENUM('openai', 'anthropic');--> statement-breakpoint
CREATE TABLE "ai_provider_configs" (
	"user_id" uuid NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"ciphertext" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"key_last4" text NOT NULL,
	"model" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_provider_configs_user_id_provider_pk" PRIMARY KEY("user_id","provider")
);
