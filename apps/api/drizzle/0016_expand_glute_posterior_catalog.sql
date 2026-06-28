-- Data-only migration: expand the catalog with posterior-chain / glute / unilateral
-- lower-body work — standing (incl. single-leg) hamstring curls, hack-squat
-- variants, a deep front squat, hip-thrust variants, glute kickbacks (cable /
-- machine / quadruped) and hip-extension / abduction movements. Idempotent via
-- ON CONFLICT so it is safe on databases that already ran the earlier seeds.
INSERT INTO "exercises" ("slug", "name", "category", "equipment", "primary_muscle") VALUES
	-- Hamstring curls (femoral), incl. standing single-leg
	('standing-leg-curl', 'Standing Leg Curl', 'legs', 'machine', 'hamstrings'),
	('standing-single-leg-curl', 'Standing Single-Leg Curl', 'legs', 'machine', 'hamstrings'),
	('glute-ham-raise', 'Glute-Ham Raise', 'legs', 'bodyweight', 'hamstrings'),
	-- Hack squat variants
	('reverse-hack-squat', 'Reverse Hack Squat', 'legs', 'machine', 'glutes'),
	('barbell-hack-squat', 'Barbell Hack Squat', 'legs', 'barbell', 'quads'),
	('v-squat', 'V-Squat', 'legs', 'machine', 'quads'),
	('pendulum-squat', 'Pendulum Squat', 'legs', 'machine', 'quads'),
	-- Front squat (deep / ATG)
	('deep-front-squat', 'Deep Front Squat', 'squat', 'barbell', 'quads'),
	-- Hip thrust variants
	('dumbbell-hip-thrust', 'Dumbbell Hip Thrust', 'legs', 'dumbbell', 'glutes'),
	('machine-hip-thrust', 'Machine Hip Thrust', 'legs', 'machine', 'glutes'),
	('smith-machine-hip-thrust', 'Smith Machine Hip Thrust', 'legs', 'machine', 'glutes'),
	('single-leg-hip-thrust', 'Single-Leg Hip Thrust', 'legs', 'bodyweight', 'glutes'),
	('b-stance-hip-thrust', 'B-Stance Hip Thrust', 'legs', 'barbell', 'glutes'),
	('glute-bridge', 'Glute Bridge', 'legs', 'barbell', 'glutes'),
	('kas-glute-bridge', 'KAS Glute Bridge', 'legs', 'barbell', 'glutes'),
	('frog-pump', 'Frog Pump', 'legs', 'dumbbell', 'glutes'),
	-- Glute kickbacks (patadas de glúteo: cable / machine / cuadrupedia-prono)
	('cable-glute-kickback', 'Cable Glute Kickback', 'legs', 'cable', 'glutes'),
	('machine-glute-kickback', 'Machine Glute Kickback', 'legs', 'machine', 'glutes'),
	('quadruped-hip-extension', 'Quadruped Hip Extension', 'legs', 'bodyweight', 'glutes'),
	('donkey-kick', 'Donkey Kick', 'legs', 'bodyweight', 'glutes'),
	-- Hip extension / pull-through / abduction
	('cable-pull-through', 'Cable Pull-Through', 'legs', 'cable', 'glutes'),
	('hip-extension-machine', 'Hip Extension Machine', 'legs', 'machine', 'glutes'),
	('45-degree-hip-extension', '45° Hip Extension', 'legs', 'machine', 'glutes'),
	('hip-abduction', 'Hip Abduction Machine', 'legs', 'machine', 'glutes'),
	('cable-hip-abduction', 'Cable Hip Abduction', 'legs', 'cable', 'glutes'),
	-- Unilateral / single-leg posterior-chain + quad accessories
	('single-leg-rdl', 'Single-Leg Romanian Deadlift', 'legs', 'dumbbell', 'hamstrings'),
	('b-stance-rdl', 'B-Stance Romanian Deadlift', 'legs', 'dumbbell', 'hamstrings'),
	('single-leg-press', 'Single-Leg Press', 'legs', 'machine', 'quads'),
	('curtsy-lunge', 'Curtsy Lunge', 'legs', 'dumbbell', 'glutes'),
	('cossack-squat', 'Cossack Squat', 'legs', 'bodyweight', 'quads'),
	('sissy-squat', 'Sissy Squat', 'legs', 'bodyweight', 'quads')
ON CONFLICT ("slug") DO NOTHING;
