CREATE TABLE "exercise_translations" (
	"exercise_id" uuid NOT NULL,
	"locale" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "exercise_translations_exercise_id_locale_pk" PRIMARY KEY("exercise_id","locale")
);
--> statement-breakpoint
ALTER TABLE "exercise_translations" ADD CONSTRAINT "exercise_translations_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;