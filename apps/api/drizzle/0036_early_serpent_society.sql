CREATE TABLE "coach_athlete_notes" (
	"coach_id" uuid NOT NULL,
	"athlete_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coach_athlete_notes_coach_id_athlete_id_pk" PRIMARY KEY("coach_id","athlete_id")
);
