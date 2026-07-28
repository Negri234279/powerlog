CREATE TABLE "user_presence" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL
);
