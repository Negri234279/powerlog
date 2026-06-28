-- Data-only migration: expand the shoulders catalog with the variants not yet
-- seeded — machine/Smith/unilateral presses (Z press, behind-the-neck, pike),
-- machine & cable lateral raises (leaning, single-arm, Y-raise, seated), cable/
-- barbell front raises, cable & machine rear-delt work, and upright-row variants.
-- Idempotent via ON CONFLICT so it is safe on databases that already ran the
-- earlier seeds (0007 / 0015).
INSERT INTO "exercises" ("slug", "name", "category", "equipment", "primary_muscle") VALUES
	-- Presses (machine / Smith / unilateral / variants)
	('dumbbell-shoulder-press', 'Standing Dumbbell Shoulder Press', 'shoulders', 'dumbbell', 'shoulders'),
	('smith-machine-shoulder-press', 'Smith Machine Shoulder Press', 'shoulders', 'machine', 'shoulders'),
	('single-arm-dumbbell-press', 'Single-Arm Dumbbell Press', 'shoulders', 'dumbbell', 'shoulders'),
	('single-arm-landmine-press', 'Single-Arm Landmine Press', 'shoulders', 'barbell', 'shoulders'),
	('z-press', 'Z Press', 'shoulders', 'barbell', 'shoulders'),
	('behind-the-neck-press', 'Behind-the-Neck Press', 'shoulders', 'barbell', 'shoulders'),
	('pike-push-up', 'Pike Push-Up', 'shoulders', 'bodyweight', 'shoulders'),
	-- Lateral raises (medial delt — machine / cable / unilateral)
	('machine-lateral-raise', 'Machine Lateral Raise', 'shoulders', 'machine', 'shoulders'),
	('single-arm-cable-lateral-raise', 'Single-Arm Cable Lateral Raise', 'shoulders', 'cable', 'shoulders'),
	('leaning-cable-lateral-raise', 'Leaning Cable Lateral Raise', 'shoulders', 'cable', 'shoulders'),
	('seated-lateral-raise', 'Seated Dumbbell Lateral Raise', 'shoulders', 'dumbbell', 'shoulders'),
	('cable-y-raise', 'Cable Y-Raise', 'shoulders', 'cable', 'shoulders'),
	-- Front raises (anterior delt)
	('cable-front-raise', 'Cable Front Raise', 'shoulders', 'cable', 'shoulders'),
	('barbell-front-raise', 'Barbell Front Raise', 'shoulders', 'barbell', 'shoulders'),
	-- Rear delts (posterior — cable / machine / unilateral)
	('cable-rear-delt-fly', 'Cable Rear Delt Fly', 'shoulders', 'cable', 'shoulders'),
	('single-arm-cable-rear-delt-fly', 'Single-Arm Cable Rear Delt Fly', 'shoulders', 'cable', 'shoulders'),
	('machine-rear-delt-row', 'Machine Rear Delt Row', 'shoulders', 'machine', 'shoulders'),
	-- Upright rows / traps
	('cable-upright-row', 'Cable Upright Row', 'shoulders', 'cable', 'shoulders'),
	('dumbbell-upright-row', 'Dumbbell Upright Row', 'shoulders', 'dumbbell', 'shoulders')
ON CONFLICT ("slug") DO NOTHING;
