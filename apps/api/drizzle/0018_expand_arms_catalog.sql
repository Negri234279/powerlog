-- Data-only migration: expand the arms catalog with biceps & triceps variants —
-- machine, barbell, dumbbell, cable and bodyweight movements not yet seeded.
-- Idempotent via ON CONFLICT so it is safe on databases that already ran the
-- earlier seeds (0007 / 0015).
INSERT INTO "exercises" ("slug", "name", "category", "equipment", "primary_muscle") VALUES
	-- Biceps — machine
	('machine-curl', 'Machine Curl', 'arms', 'machine', 'biceps'),
	('machine-independent-curl', 'Machine Independent Curl', 'arms', 'machine', 'biceps'),
	('machine-preacher-curl', 'Machine Preacher Curl', 'arms', 'machine', 'biceps'),
	-- Biceps — barbell
	('drag-curl', 'Drag Curl', 'arms', 'barbell', 'biceps'),
	('wide-grip-barbell-curl', 'Wide-Grip Barbell Curl', 'arms', 'barbell', 'biceps'),
	('close-grip-barbell-curl', 'Close-Grip Barbell Curl', 'arms', 'barbell', 'biceps'),
	-- Biceps — dumbbell
	('dumbbell-preacher-curl', 'Dumbbell Preacher Curl', 'arms', 'dumbbell', 'biceps'),
	('spider-curl', 'Spider Curl', 'arms', 'dumbbell', 'biceps'),
	('seated-dumbbell-curl', 'Seated Dumbbell Curl', 'arms', 'dumbbell', 'biceps'),
	('zottman-curl', 'Zottman Curl', 'arms', 'dumbbell', 'biceps'),
	('cross-body-hammer-curl', 'Cross-Body Hammer Curl', 'arms', 'dumbbell', 'biceps'),
	('incline-hammer-curl', 'Incline Hammer Curl', 'arms', 'dumbbell', 'biceps'),
	('waiter-curl', 'Waiter Curl', 'arms', 'dumbbell', 'biceps'),
	('single-arm-preacher-curl', 'Single-Arm Preacher Curl', 'arms', 'dumbbell', 'biceps'),
	-- Biceps — cable
	('cable-hammer-curl', 'Cable Hammer Curl', 'arms', 'cable', 'biceps'),
	('bayesian-cable-curl', 'Bayesian Cable Curl', 'arms', 'cable', 'biceps'),
	('high-cable-curl', 'High Cable Curl', 'arms', 'cable', 'biceps'),
	('cable-rope-curl', 'Cable Rope Curl', 'arms', 'cable', 'biceps'),
	('single-arm-cable-curl', 'Single-Arm Cable Curl', 'arms', 'cable', 'biceps'),
	('cable-crossover-curl', 'Cable Crossover Curl', 'arms', 'cable', 'biceps'),
	-- Triceps — machine
	('machine-triceps-extension', 'Triceps Extension Machine', 'arms', 'machine', 'triceps'),
	('machine-triceps-dip', 'Machine Triceps Dip', 'arms', 'machine', 'triceps'),
	('assisted-dip', 'Assisted Dip Machine', 'arms', 'machine', 'triceps'),
	('single-arm-machine-triceps-extension', 'Single-Arm Machine Triceps Extension', 'arms', 'machine', 'triceps'),
	-- Triceps — barbell
	('ez-bar-skullcrusher', 'EZ-Bar Skullcrusher', 'arms', 'barbell', 'triceps'),
	('jm-press', 'JM Press', 'arms', 'barbell', 'triceps'),
	('seated-barbell-overhead-triceps-extension', 'Seated Barbell Overhead Triceps Extension', 'arms', 'barbell', 'triceps'),
	('incline-skullcrusher', 'Incline Skullcrusher', 'arms', 'barbell', 'triceps'),
	-- Triceps — dumbbell
	('tate-press', 'Tate Press', 'arms', 'dumbbell', 'triceps'),
	('single-arm-overhead-triceps-extension', 'Single-Arm Dumbbell Overhead Extension', 'arms', 'dumbbell', 'triceps'),
	('dumbbell-triceps-kickback', 'Dumbbell Triceps Kickback', 'arms', 'dumbbell', 'triceps'),
	-- Triceps — cable
	('cable-triceps-kickback', 'Cable Triceps Kickback', 'arms', 'cable', 'triceps'),
	('single-arm-cable-pushdown', 'Single-Arm Cable Pushdown', 'arms', 'cable', 'triceps'),
	('v-bar-pushdown', 'V-Bar Pushdown', 'arms', 'cable', 'triceps'),
	('straight-bar-pushdown', 'Straight-Bar Pushdown', 'arms', 'cable', 'triceps'),
	('reverse-grip-pushdown', 'Reverse-Grip Pushdown', 'arms', 'cable', 'triceps'),
	('cable-crossover-triceps-extension', 'Cable Crossover Triceps Extension', 'arms', 'cable', 'triceps'),
	('single-arm-cable-overhead-triceps-extension', 'Single-Arm Cable Overhead Extension', 'arms', 'cable', 'triceps'),
	('single-arm-cable-kickback', 'Single-Arm Cable Kickback', 'arms', 'cable', 'triceps'),
	-- Triceps — bodyweight
	('triceps-dip', 'Triceps Dip', 'arms', 'bodyweight', 'triceps'),
	('close-grip-push-up', 'Close-Grip Push-Up', 'arms', 'bodyweight', 'triceps')
ON CONFLICT ("slug") DO NOTHING;
