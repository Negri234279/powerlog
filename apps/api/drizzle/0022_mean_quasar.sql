CREATE INDEX "workout_exercise_entries_session_exercise_idx" ON "workout_exercise_entries" USING btree ("session_id","exercise_id");--> statement-breakpoint
CREATE INDEX "workout_sessions_user_status_performed_idx" ON "workout_sessions" USING btree ("user_id","status","performed_at");--> statement-breakpoint
CREATE INDEX "workout_sets_entry_idx" ON "workout_sets" USING btree ("entry_id");