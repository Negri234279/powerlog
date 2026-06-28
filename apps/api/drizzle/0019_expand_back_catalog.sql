-- Data-only migration: expand the back catalog with the variants not yet seeded
-- — lat-pulldown grips (wide/close/neutral/reverse/V-bar/behind-the-neck) and
-- unilateral pulldowns, machine pulldowns, assisted/weighted pull-ups, pullovers
-- (dumbbell/cable/machine), cable rows (low/high/standing/unilateral/grip),
-- machine rows (hammer/iso-lateral/smith), free-weight row variants (seal, Yates,
-- landmine, chest-supported DB, Kroc) and trap/lower-back machine work.
-- Idempotent via ON CONFLICT so it is safe on databases that already ran the
-- earlier seeds (0007 / 0015 / 0016).
INSERT INTO "exercises" ("slug", "name", "category", "equipment", "primary_muscle") VALUES
	-- Lat pulldowns — cable (grip & unilateral variants)
	('wide-grip-lat-pulldown', 'Wide-Grip Lat Pulldown', 'back', 'cable', 'lats'),
	('close-grip-lat-pulldown', 'Close-Grip Lat Pulldown', 'back', 'cable', 'lats'),
	('neutral-grip-lat-pulldown', 'Neutral-Grip Lat Pulldown', 'back', 'cable', 'lats'),
	('reverse-grip-lat-pulldown', 'Reverse-Grip (Underhand) Lat Pulldown', 'back', 'cable', 'lats'),
	('v-bar-lat-pulldown', 'V-Bar Lat Pulldown', 'back', 'cable', 'lats'),
	('single-arm-lat-pulldown', 'Single-Arm Cable Lat Pulldown', 'back', 'cable', 'lats'),
	('kneeling-cable-pulldown', 'Kneeling Cable Pulldown', 'back', 'cable', 'lats'),
	('behind-the-neck-pulldown', 'Behind-the-Neck Lat Pulldown', 'back', 'cable', 'lats'),
	-- Lat pulldowns — machine
	('machine-lat-pulldown', 'Machine Lat Pulldown', 'back', 'machine', 'lats'),
	('iso-lateral-pulldown', 'Iso-Lateral Machine Pulldown', 'back', 'machine', 'lats'),
	-- Pull-ups / chin-ups (bodyweight + assisted machine)
	('neutral-grip-pull-up', 'Neutral-Grip Pull-Up', 'back', 'bodyweight', 'lats'),
	('close-grip-pull-up', 'Close-Grip Pull-Up', 'back', 'bodyweight', 'lats'),
	('weighted-pull-up', 'Weighted Pull-Up', 'back', 'bodyweight', 'lats'),
	('assisted-pull-up', 'Assisted Pull-Up (Machine)', 'back', 'machine', 'lats'),
	('assisted-chin-up', 'Assisted Chin-Up (Machine)', 'back', 'machine', 'lats'),
	-- Pullovers (lat-focused)
	('dumbbell-pullover', 'Dumbbell Pullover', 'back', 'dumbbell', 'lats'),
	('cable-pullover', 'Cable Pullover', 'back', 'cable', 'lats'),
	('machine-pullover', 'Machine Pullover', 'back', 'machine', 'lats'),
	-- Cable rows (low / high / unilateral / grip variants)
	('wide-grip-seated-cable-row', 'Wide-Grip Seated Cable Row', 'back', 'cable', 'back'),
	('close-grip-cable-row', 'Close-Grip Cable Row', 'back', 'cable', 'back'),
	('single-arm-cable-row', 'Single-Arm Cable Row', 'back', 'cable', 'back'),
	('high-cable-row', 'High Cable Row', 'back', 'cable', 'back'),
	('standing-cable-row', 'Standing Cable Row', 'back', 'cable', 'back'),
	('reverse-grip-cable-row', 'Reverse-Grip Cable Row', 'back', 'cable', 'back'),
	('cable-rope-row', 'Rope Cable Row', 'back', 'cable', 'back'),
	-- Machine rows
	('hammer-strength-row', 'Hammer Strength Row', 'back', 'machine', 'back'),
	('iso-lateral-row', 'Iso-Lateral Machine Row', 'back', 'machine', 'back'),
	('smith-machine-row', 'Smith Machine Row', 'back', 'machine', 'back'),
	('seated-machine-high-row', 'Seated Machine High Row', 'back', 'machine', 'lats'),
	-- Free-weight rows (variants & unilateral)
	('seal-row', 'Seal Row', 'back', 'barbell', 'back'),
	('yates-row', 'Yates Row (Reverse-Grip)', 'back', 'barbell', 'back'),
	('landmine-row', 'Landmine Row', 'back', 'barbell', 'back'),
	('chest-supported-dumbbell-row', 'Chest-Supported Dumbbell Row', 'back', 'dumbbell', 'back'),
	('kroc-row', 'Kroc Row', 'back', 'dumbbell', 'back'),
	-- Traps / shrugs
	('cable-shrug', 'Cable Shrug', 'back', 'cable', 'back'),
	('machine-shrug', 'Machine Shrug', 'back', 'machine', 'back'),
	('trap-bar-shrug', 'Trap Bar Shrug', 'back', 'barbell', 'back'),
	-- Lower back / posterior chain (machine)
	('machine-back-extension', 'Machine Back Extension', 'back', 'machine', 'hamstrings'),
	('reverse-hyperextension', 'Reverse Hyperextension', 'back', 'machine', 'glutes')
ON CONFLICT ("slug") DO NOTHING;
