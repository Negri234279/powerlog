-- Data-only migration: expand the legs catalog with the gaps left after the
-- earlier seeds — adductor / adduction work (machine, cable, Copenhagen, sumo/
-- plié squats), extra leg-press & leg-extension variants, more lunges / split
-- squats, unilateral & bodyweight hamstring curls, and additional calf variants.
-- The muscle enum has no "adductors"; adduction maps to 'quads' (medial thigh),
-- mirroring how abduction was seeded as 'glutes'.
-- Idempotent via ON CONFLICT so it is safe on databases that already ran the
-- earlier seeds (0007 / 0015 / 0016).
INSERT INTO "exercises" ("slug", "name", "category", "equipment", "primary_muscle") VALUES
	-- Adductors / adduction (inner thigh)
	('hip-adduction', 'Hip Adduction Machine', 'legs', 'machine', 'quads'),
	('cable-hip-adduction', 'Cable Hip Adduction', 'legs', 'cable', 'quads'),
	('copenhagen-plank', 'Copenhagen Plank', 'legs', 'bodyweight', 'quads'),
	('sumo-squat', 'Sumo Squat', 'legs', 'dumbbell', 'glutes'),
	('plie-squat', 'Plié Squat', 'legs', 'dumbbell', 'glutes'),
	-- Quads — leg press / extension / machine variants
	('horizontal-leg-press', 'Horizontal Leg Press', 'legs', 'machine', 'quads'),
	('vertical-leg-press', 'Vertical Leg Press', 'legs', 'machine', 'quads'),
	('single-leg-extension', 'Single-Leg Extension', 'legs', 'machine', 'quads'),
	('landmine-squat', 'Landmine Squat', 'legs', 'barbell', 'quads'),
	-- Lunges / split squats
	('lateral-lunge', 'Lateral Lunge', 'legs', 'dumbbell', 'quads'),
	('barbell-lunge', 'Barbell Lunge', 'legs', 'barbell', 'quads'),
	('smith-machine-lunge', 'Smith Machine Lunge', 'legs', 'machine', 'quads'),
	('split-squat', 'Split Squat', 'legs', 'dumbbell', 'quads'),
	('deficit-reverse-lunge', 'Deficit Reverse Lunge', 'legs', 'dumbbell', 'quads'),
	-- Hamstrings — unilateral & bodyweight curls
	('single-leg-lying-curl', 'Single-Leg Lying Curl', 'legs', 'machine', 'hamstrings'),
	('seated-single-leg-curl', 'Seated Single-Leg Curl', 'legs', 'machine', 'hamstrings'),
	('stability-ball-leg-curl', 'Stability Ball Leg Curl', 'legs', 'bodyweight', 'hamstrings'),
	('slider-leg-curl', 'Slider Leg Curl', 'legs', 'bodyweight', 'hamstrings'),
	-- Calves
	('leg-press-calf-raise', 'Leg Press Calf Raise', 'legs', 'machine', 'calves'),
	('smith-machine-calf-raise', 'Smith Machine Calf Raise', 'legs', 'machine', 'calves'),
	('donkey-calf-raise', 'Donkey Calf Raise', 'legs', 'machine', 'calves'),
	('single-leg-calf-raise', 'Single-Leg Calf Raise', 'legs', 'dumbbell', 'calves'),
	('tibialis-raise', 'Tibialis Raise', 'legs', 'bodyweight', 'calves')
ON CONFLICT ("slug") DO NOTHING;
