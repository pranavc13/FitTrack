/**
 * Exercise library. MET values reference the 2024 Compendium:
 *   02050 6.0 free-weight resistance training (vigorous)   02054 3.5 resistance training, multiple exercises
 *   02052 5.0 squats/deadlifts                              02022 3.8 calisthenics, moderate
 *   02024 2.8 calisthenics light (crunches, plank)          02020 7.5 calisthenics vigorous (burpees, jumping jacks)
 *   02214 11.0 HIIT (burpees, mountain climbers, squat jumps)
 * Reference images/videos are not bundled (licensing); the UI links to a web search instead.
 */
export type Muscle =
  | "chest" | "back" | "shoulders" | "biceps" | "triceps" | "forearms" | "abs" | "core"
  | "quadriceps" | "hamstrings" | "glutes" | "calves" | "full_body";

export interface SeedExercise {
  slug: string;
  name: string;
  primary: Muscle;
  secondary: Muscle[];
  equipment: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  mechanics: "compound" | "isolation";
  location: "gym" | "home" | "both";
  sets: number;
  reps: string;
  rest: number;
  met: number;
  metCode: string;
  instructions: string[];
  mistakes: string[];
  alternatives: string[];
}

const ex = (e: SeedExercise) => e;

export const EXERCISES: SeedExercise[] = [
  // ---- Chest ----
  ex({ slug: "barbell-bench-press", name: "Barbell bench press", primary: "chest", secondary: ["triceps", "shoulders"], equipment: ["barbell", "bench"], difficulty: "intermediate", mechanics: "compound", location: "gym", sets: 4, reps: "6-10", rest: 120, met: 6.0, metCode: "02050",
    instructions: ["Lie on the bench, eyes under the bar, feet flat.", "Grip slightly wider than shoulders, retract shoulder blades.", "Lower the bar under control to mid-chest.", "Press up and slightly back to lockout."],
    mistakes: ["Flaring elbows to 90°", "Bouncing the bar off the chest", "Lifting hips off the bench"], alternatives: ["dumbbell-bench-press", "push-up", "machine-chest-press"] }),
  ex({ slug: "dumbbell-bench-press", name: "Dumbbell bench press", primary: "chest", secondary: ["triceps", "shoulders"], equipment: ["dumbbells", "bench"], difficulty: "beginner", mechanics: "compound", location: "both", sets: 3, reps: "8-12", rest: 90, met: 6.0, metCode: "02050",
    instructions: ["Sit with dumbbells on thighs, lie back and bring them to chest level.", "Press up until arms are straight, dumbbells over shoulders.", "Lower slowly with elbows ~45° from torso."],
    mistakes: ["Dropping too deep with no control", "Clashing dumbbells at the top"], alternatives: ["barbell-bench-press", "push-up"] }),
  ex({ slug: "incline-dumbbell-press", name: "Incline dumbbell press", primary: "chest", secondary: ["shoulders", "triceps"], equipment: ["dumbbells", "bench"], difficulty: "beginner", mechanics: "compound", location: "both", sets: 3, reps: "8-12", rest: 90, met: 6.0, metCode: "02050",
    instructions: ["Set bench to 30°.", "Press dumbbells from upper chest to above the shoulders.", "Lower with control."], mistakes: ["Bench too steep (turns into shoulder press)", "Arching excessively"], alternatives: ["dumbbell-bench-press", "decline-push-up"] }),
  ex({ slug: "machine-chest-press", name: "Machine chest press", primary: "chest", secondary: ["triceps"], equipment: ["machine"], difficulty: "beginner", mechanics: "compound", location: "gym", sets: 3, reps: "10-12", rest: 75, met: 3.5, metCode: "02054",
    instructions: ["Adjust seat so handles are at mid-chest.", "Press forward without locking elbows hard.", "Return slowly."], mistakes: ["Seat too low/high", "Shrugging shoulders"], alternatives: ["dumbbell-bench-press"] }),
  ex({ slug: "push-up", name: "Push-up", primary: "chest", secondary: ["triceps", "shoulders", "core"], equipment: [], difficulty: "beginner", mechanics: "compound", location: "both", sets: 3, reps: "8-20", rest: 60, met: 3.8, metCode: "02022",
    instructions: ["Hands slightly wider than shoulders, body in a straight line.", "Lower chest to just above the floor.", "Push back up, keeping core tight."], mistakes: ["Sagging hips", "Half reps", "Head dropping"], alternatives: ["incline-push-up", "dumbbell-bench-press"] }),
  ex({ slug: "incline-push-up", name: "Incline push-up", primary: "chest", secondary: ["triceps"], equipment: ["bench or wall"], difficulty: "beginner", mechanics: "compound", location: "home", sets: 3, reps: "10-15", rest: 60, met: 3.8, metCode: "02022",
    instructions: ["Hands on a bench/table edge.", "Lower chest to the edge, push back up."], mistakes: ["Hips piking up"], alternatives: ["push-up"] }),
  ex({ slug: "decline-push-up", name: "Decline push-up", primary: "chest", secondary: ["shoulders", "triceps"], equipment: ["bench"], difficulty: "intermediate", mechanics: "compound", location: "home", sets: 3, reps: "8-15", rest: 60, met: 3.8, metCode: "02022",
    instructions: ["Feet elevated on a bench or bed.", "Perform push-ups with body straight."], mistakes: ["Sagging lower back"], alternatives: ["push-up", "incline-dumbbell-press"] }),
  ex({ slug: "cable-fly", name: "Cable fly", primary: "chest", secondary: ["shoulders"], equipment: ["cable machine"], difficulty: "intermediate", mechanics: "isolation", location: "gym", sets: 3, reps: "12-15", rest: 60, met: 3.5, metCode: "02054",
    instructions: ["Stand between cables, slight bend in elbows.", "Bring handles together in an arc in front of the chest.", "Return slowly to a stretch."], mistakes: ["Turning it into a press", "Too heavy"], alternatives: ["dumbbell-fly"] }),
  ex({ slug: "dumbbell-fly", name: "Dumbbell fly", primary: "chest", secondary: [], equipment: ["dumbbells", "bench"], difficulty: "intermediate", mechanics: "isolation", location: "both", sets: 3, reps: "10-15", rest: 60, met: 3.5, metCode: "02054",
    instructions: ["Lie on bench, dumbbells above chest, elbows softly bent.", "Open arms wide until a stretch, then bring back together."], mistakes: ["Straight elbows stressing joints", "Going too deep"], alternatives: ["cable-fly"] }),
  ex({ slug: "dips", name: "Parallel bar dips", primary: "chest", secondary: ["triceps", "shoulders"], equipment: ["dip bars"], difficulty: "intermediate", mechanics: "compound", location: "gym", sets: 3, reps: "6-12", rest: 90, met: 3.8, metCode: "02022",
    instructions: ["Support on bars, lean slightly forward.", "Lower until upper arms are parallel to the floor.", "Press back up."], mistakes: ["Dropping too low with shoulder pain", "Swinging"], alternatives: ["bench-dip", "push-up"] }),

  // ---- Back ----
  ex({ slug: "deadlift", name: "Conventional deadlift", primary: "back", secondary: ["hamstrings", "glutes", "forearms", "core"], equipment: ["barbell"], difficulty: "advanced", mechanics: "compound", location: "gym", sets: 3, reps: "3-6", rest: 180, met: 5.0, metCode: "02052",
    instructions: ["Bar over mid-foot, hip-width stance.", "Hinge and grip just outside the knees; flat back, chest up.", "Push the floor away and stand up, bar close to legs.", "Return by hinging at the hips."],
    mistakes: ["Rounding the lower back", "Bar drifting away from the body", "Hyperextending at lockout"], alternatives: ["romanian-deadlift", "trap-bar-deadlift", "hip-hinge-good-morning"] }),
  ex({ slug: "trap-bar-deadlift", name: "Trap-bar deadlift", primary: "back", secondary: ["quadriceps", "glutes", "hamstrings"], equipment: ["trap bar"], difficulty: "intermediate", mechanics: "compound", location: "gym", sets: 3, reps: "5-8", rest: 150, met: 5.0, metCode: "02052",
    instructions: ["Stand inside the bar, grip handles.", "Brace, push through legs to stand.", "Lower with control."], mistakes: ["Squatting too low", "Rounding back"], alternatives: ["deadlift"] }),
  ex({ slug: "pull-up", name: "Pull-up", primary: "back", secondary: ["biceps", "forearms"], equipment: ["pull-up bar"], difficulty: "intermediate", mechanics: "compound", location: "both", sets: 3, reps: "5-10", rest: 120, met: 3.8, metCode: "02022",
    instructions: ["Hang with overhand grip, shoulder-width.", "Pull chest toward the bar by driving elbows down.", "Lower to full arm extension."], mistakes: ["Kipping/swinging", "Half reps"], alternatives: ["lat-pulldown", "inverted-row", "negative-pull-up"] }),
  ex({ slug: "negative-pull-up", name: "Negative pull-up", primary: "back", secondary: ["biceps"], equipment: ["pull-up bar"], difficulty: "beginner", mechanics: "compound", location: "both", sets: 3, reps: "3-6 (5 s lowering)", rest: 90, met: 3.8, metCode: "02022",
    instructions: ["Jump or step to the top position.", "Lower yourself slowly over 3–5 seconds."], mistakes: ["Dropping quickly"], alternatives: ["pull-up", "lat-pulldown"] }),
  ex({ slug: "lat-pulldown", name: "Lat pulldown", primary: "back", secondary: ["biceps"], equipment: ["cable machine"], difficulty: "beginner", mechanics: "compound", location: "gym", sets: 3, reps: "8-12", rest: 90, met: 3.5, metCode: "02054",
    instructions: ["Grip bar wider than shoulders, thighs locked under pads.", "Pull bar to upper chest, elbows down and back.", "Return slowly."], mistakes: ["Leaning far back", "Pulling behind the neck"], alternatives: ["pull-up", "resistance-band-pulldown"] }),
  ex({ slug: "barbell-row", name: "Barbell bent-over row", primary: "back", secondary: ["biceps", "core"], equipment: ["barbell"], difficulty: "intermediate", mechanics: "compound", location: "gym", sets: 4, reps: "6-10", rest: 120, met: 6.0, metCode: "02050",
    instructions: ["Hinge to ~45°, flat back.", "Row bar to lower ribs, squeeze shoulder blades.", "Lower under control."], mistakes: ["Standing too upright", "Jerking the weight"], alternatives: ["dumbbell-row", "seated-cable-row"] }),
  ex({ slug: "dumbbell-row", name: "One-arm dumbbell row", primary: "back", secondary: ["biceps"], equipment: ["dumbbell", "bench"], difficulty: "beginner", mechanics: "compound", location: "both", sets: 3, reps: "8-12 each", rest: 75, met: 6.0, metCode: "02050",
    instructions: ["One hand and knee on bench, back flat.", "Row dumbbell to hip.", "Lower to full stretch."], mistakes: ["Twisting the torso", "Shrugging"], alternatives: ["barbell-row", "inverted-row"] }),
  ex({ slug: "seated-cable-row", name: "Seated cable row", primary: "back", secondary: ["biceps"], equipment: ["cable machine"], difficulty: "beginner", mechanics: "compound", location: "gym", sets: 3, reps: "10-12", rest: 75, met: 3.5, metCode: "02054",
    instructions: ["Sit tall, slight knee bend.", "Pull handle to abdomen, elbows close.", "Return with control."], mistakes: ["Rocking back and forth"], alternatives: ["dumbbell-row"] }),
  ex({ slug: "inverted-row", name: "Inverted row (table/bar)", primary: "back", secondary: ["biceps", "core"], equipment: ["sturdy table or bar"], difficulty: "beginner", mechanics: "compound", location: "home", sets: 3, reps: "8-12", rest: 60, met: 3.8, metCode: "02022",
    instructions: ["Lie under a sturdy table/bar, grip the edge.", "Pull chest to the edge with body straight.", "Lower slowly."], mistakes: ["Hips sagging"], alternatives: ["dumbbell-row", "pull-up"] }),
  ex({ slug: "resistance-band-pulldown", name: "Resistance band pulldown", primary: "back", secondary: ["biceps"], equipment: ["resistance band"], difficulty: "beginner", mechanics: "compound", location: "home", sets: 3, reps: "12-15", rest: 60, met: 3.5, metCode: "02054",
    instructions: ["Anchor band high (door anchor).", "Pull down to chest, elbows to sides."], mistakes: ["Using momentum"], alternatives: ["lat-pulldown"] }),
  ex({ slug: "face-pull", name: "Face pull", primary: "shoulders", secondary: ["back"], equipment: ["cable machine or band"], difficulty: "beginner", mechanics: "isolation", location: "both", sets: 3, reps: "12-15", rest: 60, met: 3.5, metCode: "02054",
    instructions: ["Rope at face height.", "Pull toward the face, elbows high, rotate hands outward."], mistakes: ["Too heavy", "Leaning back"], alternatives: ["reverse-fly"] }),

  // ---- Shoulders ----
  ex({ slug: "overhead-press", name: "Barbell overhead press", primary: "shoulders", secondary: ["triceps", "core"], equipment: ["barbell"], difficulty: "intermediate", mechanics: "compound", location: "gym", sets: 4, reps: "5-8", rest: 120, met: 6.0, metCode: "02050",
    instructions: ["Bar on front shoulders, grip just outside shoulders.", "Brace and press overhead, head through at the top.", "Lower to collarbone."], mistakes: ["Arching lower back", "Pressing forward"], alternatives: ["dumbbell-shoulder-press", "pike-push-up"] }),
  ex({ slug: "dumbbell-shoulder-press", name: "Seated dumbbell shoulder press", primary: "shoulders", secondary: ["triceps"], equipment: ["dumbbells", "bench"], difficulty: "beginner", mechanics: "compound", location: "both", sets: 3, reps: "8-12", rest: 90, met: 6.0, metCode: "02050",
    instructions: ["Sit upright, dumbbells at shoulder height.", "Press overhead without clanging.", "Lower to ear level."], mistakes: ["Excessive back arch"], alternatives: ["overhead-press", "pike-push-up"] }),
  ex({ slug: "pike-push-up", name: "Pike push-up", primary: "shoulders", secondary: ["triceps"], equipment: [], difficulty: "intermediate", mechanics: "compound", location: "home", sets: 3, reps: "6-12", rest: 75, met: 3.8, metCode: "02022",
    instructions: ["Hips high in an inverted V.", "Lower head toward the floor between hands.", "Press back up."], mistakes: ["Turning it into a regular push-up"], alternatives: ["dumbbell-shoulder-press"] }),
  ex({ slug: "lateral-raise", name: "Dumbbell lateral raise", primary: "shoulders", secondary: [], equipment: ["dumbbells"], difficulty: "beginner", mechanics: "isolation", location: "both", sets: 3, reps: "12-15", rest: 60, met: 3.5, metCode: "02054",
    instructions: ["Slight forward lean, soft elbows.", "Raise arms out to shoulder height.", "Lower slowly."], mistakes: ["Swinging", "Shrugging traps"], alternatives: ["cable-lateral-raise"] }),
  ex({ slug: "cable-lateral-raise", name: "Cable lateral raise", primary: "shoulders", secondary: [], equipment: ["cable machine"], difficulty: "intermediate", mechanics: "isolation", location: "gym", sets: 3, reps: "12-15", rest: 60, met: 3.5, metCode: "02054",
    instructions: ["Low pulley, cross-body handle.", "Raise arm out to shoulder height."], mistakes: ["Using body momentum"], alternatives: ["lateral-raise"] }),
  ex({ slug: "reverse-fly", name: "Reverse dumbbell fly", primary: "shoulders", secondary: ["back"], equipment: ["dumbbells"], difficulty: "beginner", mechanics: "isolation", location: "both", sets: 3, reps: "12-15", rest: 60, met: 3.5, metCode: "02054",
    instructions: ["Hinge forward, arms hanging.", "Raise arms out to the sides, squeezing shoulder blades."], mistakes: ["Too heavy, swinging"], alternatives: ["face-pull"] }),

  // ---- Arms ----
  ex({ slug: "barbell-curl", name: "Barbell curl", primary: "biceps", secondary: ["forearms"], equipment: ["barbell"], difficulty: "beginner", mechanics: "isolation", location: "gym", sets: 3, reps: "8-12", rest: 60, met: 3.5, metCode: "02054",
    instructions: ["Stand tall, underhand grip.", "Curl the bar up keeping elbows pinned.", "Lower fully."], mistakes: ["Swinging the torso", "Elbows drifting forward"], alternatives: ["dumbbell-curl"] }),
  ex({ slug: "dumbbell-curl", name: "Dumbbell curl", primary: "biceps", secondary: ["forearms"], equipment: ["dumbbells"], difficulty: "beginner", mechanics: "isolation", location: "both", sets: 3, reps: "10-12", rest: 60, met: 3.5, metCode: "02054",
    instructions: ["Curl dumbbells with palms up, elbows at sides.", "Lower slowly."], mistakes: ["Partial range"], alternatives: ["hammer-curl", "band-curl"] }),
  ex({ slug: "hammer-curl", name: "Hammer curl", primary: "biceps", secondary: ["forearms"], equipment: ["dumbbells"], difficulty: "beginner", mechanics: "isolation", location: "both", sets: 3, reps: "10-12", rest: 60, met: 3.5, metCode: "02054",
    instructions: ["Neutral grip (palms facing).", "Curl up and lower slowly."], mistakes: ["Swinging"], alternatives: ["dumbbell-curl"] }),
  ex({ slug: "band-curl", name: "Resistance band curl", primary: "biceps", secondary: [], equipment: ["resistance band"], difficulty: "beginner", mechanics: "isolation", location: "home", sets: 3, reps: "12-20", rest: 45, met: 3.5, metCode: "02054",
    instructions: ["Stand on the band, curl handles up."], mistakes: ["Elbows moving"], alternatives: ["dumbbell-curl"] }),
  ex({ slug: "triceps-pushdown", name: "Cable triceps pushdown", primary: "triceps", secondary: [], equipment: ["cable machine"], difficulty: "beginner", mechanics: "isolation", location: "gym", sets: 3, reps: "10-15", rest: 60, met: 3.5, metCode: "02054",
    instructions: ["Elbows pinned at sides.", "Push the bar/rope down to full extension.", "Return to 90°."], mistakes: ["Elbows flaring", "Leaning over the bar"], alternatives: ["overhead-triceps-extension", "bench-dip"] }),
  ex({ slug: "overhead-triceps-extension", name: "Overhead dumbbell triceps extension", primary: "triceps", secondary: [], equipment: ["dumbbell"], difficulty: "beginner", mechanics: "isolation", location: "both", sets: 3, reps: "10-12", rest: 60, met: 3.5, metCode: "02054",
    instructions: ["Hold one dumbbell overhead with both hands.", "Lower behind the head, elbows pointing up.", "Extend back up."], mistakes: ["Elbows flaring wide"], alternatives: ["triceps-pushdown"] }),
  ex({ slug: "close-grip-bench", name: "Close-grip bench press", primary: "triceps", secondary: ["chest"], equipment: ["barbell", "bench"], difficulty: "intermediate", mechanics: "compound", location: "gym", sets: 3, reps: "6-10", rest: 90, met: 6.0, metCode: "02050",
    instructions: ["Grip shoulder-width.", "Lower to lower chest, elbows tucked.", "Press up."], mistakes: ["Grip too narrow (wrist strain)"], alternatives: ["diamond-push-up"] }),
  ex({ slug: "bench-dip", name: "Bench dip", primary: "triceps", secondary: ["chest", "shoulders"], equipment: ["bench or chair"], difficulty: "beginner", mechanics: "compound", location: "home", sets: 3, reps: "10-15", rest: 60, met: 3.8, metCode: "02022",
    instructions: ["Hands on a chair edge behind you.", "Lower until elbows reach ~90°, press up."], mistakes: ["Going too deep", "Shoulders rolling forward"], alternatives: ["dips", "diamond-push-up"] }),
  ex({ slug: "diamond-push-up", name: "Diamond push-up", primary: "triceps", secondary: ["chest"], equipment: [], difficulty: "intermediate", mechanics: "compound", location: "home", sets: 3, reps: "6-12", rest: 60, met: 3.8, metCode: "02022",
    instructions: ["Hands together under the chest forming a diamond.", "Lower and push up keeping elbows close."], mistakes: ["Sagging hips"], alternatives: ["close-grip-bench", "bench-dip"] }),
  ex({ slug: "farmers-carry", name: "Farmer's carry", primary: "forearms", secondary: ["core", "shoulders"], equipment: ["dumbbells or buckets"], difficulty: "beginner", mechanics: "compound", location: "both", sets: 3, reps: "30-40 m", rest: 90, met: 5.0, metCode: "02052",
    instructions: ["Hold heavy weights at your sides.", "Walk tall with short steps."], mistakes: ["Leaning to one side", "Shrugging"], alternatives: ["dead-hang"] }),
  ex({ slug: "dead-hang", name: "Dead hang", primary: "forearms", secondary: ["back"], equipment: ["pull-up bar"], difficulty: "beginner", mechanics: "isolation", location: "both", sets: 3, reps: "20-60 s", rest: 60, met: 2.8, metCode: "02024",
    instructions: ["Hang from a bar with active shoulders."], mistakes: ["Fully relaxed shoulders if painful"], alternatives: ["farmers-carry"] }),

  // ---- Legs ----
  ex({ slug: "back-squat", name: "Barbell back squat", primary: "quadriceps", secondary: ["glutes", "hamstrings", "core"], equipment: ["barbell", "squat rack"], difficulty: "intermediate", mechanics: "compound", location: "gym", sets: 4, reps: "5-8", rest: 150, met: 5.0, metCode: "02052",
    instructions: ["Bar on upper back, feet shoulder-width.", "Brace, sit down between the hips to at least parallel.", "Drive up through mid-foot."], mistakes: ["Knees caving in", "Heels lifting", "Rounding at the bottom"], alternatives: ["goblet-squat", "leg-press", "bodyweight-squat"] }),
  ex({ slug: "goblet-squat", name: "Goblet squat", primary: "quadriceps", secondary: ["glutes", "core"], equipment: ["dumbbell or kettlebell"], difficulty: "beginner", mechanics: "compound", location: "both", sets: 3, reps: "10-15", rest: 75, met: 5.0, metCode: "02052",
    instructions: ["Hold a weight at the chest.", "Squat down keeping torso upright.", "Stand up."], mistakes: ["Knees caving"], alternatives: ["back-squat", "bodyweight-squat"] }),
  ex({ slug: "bodyweight-squat", name: "Bodyweight squat", primary: "quadriceps", secondary: ["glutes"], equipment: [], difficulty: "beginner", mechanics: "compound", location: "home", sets: 3, reps: "15-25", rest: 45, met: 3.8, metCode: "02022",
    instructions: ["Feet shoulder-width, arms forward.", "Sit back and down, then stand."], mistakes: ["Heels lifting", "Shallow reps"], alternatives: ["goblet-squat", "jump-squat"] }),
  ex({ slug: "leg-press", name: "Leg press", primary: "quadriceps", secondary: ["glutes"], equipment: ["machine"], difficulty: "beginner", mechanics: "compound", location: "gym", sets: 3, reps: "10-12", rest: 90, met: 3.5, metCode: "02054",
    instructions: ["Feet shoulder-width on platform.", "Lower until knees ~90°, press without locking knees."], mistakes: ["Lower back lifting off the pad"], alternatives: ["back-squat", "goblet-squat"] }),
  ex({ slug: "bulgarian-split-squat", name: "Bulgarian split squat", primary: "quadriceps", secondary: ["glutes"], equipment: ["bench", "dumbbells optional"], difficulty: "intermediate", mechanics: "compound", location: "both", sets: 3, reps: "8-12 each", rest: 75, met: 5.0, metCode: "02052",
    instructions: ["Rear foot on a bench.", "Lower the back knee toward the floor.", "Drive up through the front heel."], mistakes: ["Front knee collapsing inward"], alternatives: ["walking-lunge"] }),
  ex({ slug: "walking-lunge", name: "Walking lunge", primary: "quadriceps", secondary: ["glutes", "hamstrings"], equipment: [], difficulty: "beginner", mechanics: "compound", location: "both", sets: 3, reps: "10-12 each", rest: 60, met: 3.8, metCode: "02022",
    instructions: ["Step forward and lower the back knee.", "Push through the front heel into the next step."], mistakes: ["Short steps", "Torso collapsing"], alternatives: ["bulgarian-split-squat"] }),
  ex({ slug: "romanian-deadlift", name: "Romanian deadlift", primary: "hamstrings", secondary: ["glutes", "back"], equipment: ["barbell or dumbbells"], difficulty: "intermediate", mechanics: "compound", location: "both", sets: 3, reps: "8-10", rest: 120, met: 5.0, metCode: "02052",
    instructions: ["Soft knees, push hips back.", "Lower the weight along the legs to mid-shin with a flat back.", "Squeeze glutes to stand."], mistakes: ["Rounding the back", "Bending knees too much"], alternatives: ["hip-hinge-good-morning", "deadlift"] }),
  ex({ slug: "hip-hinge-good-morning", name: "Good morning (band/bodyweight)", primary: "hamstrings", secondary: ["back", "glutes"], equipment: ["resistance band optional"], difficulty: "beginner", mechanics: "compound", location: "home", sets: 3, reps: "12-15", rest: 60, met: 3.8, metCode: "02022",
    instructions: ["Hands behind head, soft knees.", "Hinge forward until hamstrings stretch.", "Return upright."], mistakes: ["Rounding the back"], alternatives: ["romanian-deadlift"] }),
  ex({ slug: "leg-curl", name: "Lying leg curl", primary: "hamstrings", secondary: [], equipment: ["machine"], difficulty: "beginner", mechanics: "isolation", location: "gym", sets: 3, reps: "10-15", rest: 60, met: 3.5, metCode: "02054",
    instructions: ["Pad above heels.", "Curl heels toward glutes.", "Lower slowly."], mistakes: ["Hips lifting"], alternatives: ["romanian-deadlift"] }),
  ex({ slug: "leg-extension", name: "Leg extension", primary: "quadriceps", secondary: [], equipment: ["machine"], difficulty: "beginner", mechanics: "isolation", location: "gym", sets: 3, reps: "12-15", rest: 60, met: 3.5, metCode: "02054",
    instructions: ["Extend knees fully, squeeze quads, lower slowly."], mistakes: ["Swinging the weight"], alternatives: ["bodyweight-squat"] }),
  ex({ slug: "hip-thrust", name: "Barbell hip thrust", primary: "glutes", secondary: ["hamstrings"], equipment: ["barbell", "bench"], difficulty: "intermediate", mechanics: "compound", location: "gym", sets: 3, reps: "8-12", rest: 90, met: 5.0, metCode: "02052",
    instructions: ["Upper back on bench, bar over hips.", "Drive hips up until torso is level.", "Lower with control."], mistakes: ["Hyperextending lower back"], alternatives: ["glute-bridge"] }),
  ex({ slug: "glute-bridge", name: "Glute bridge", primary: "glutes", secondary: ["hamstrings", "core"], equipment: [], difficulty: "beginner", mechanics: "compound", location: "home", sets: 3, reps: "15-20", rest: 45, met: 2.8, metCode: "02024",
    instructions: ["Lie on back, knees bent.", "Lift hips by squeezing glutes.", "Lower slowly."], mistakes: ["Arching the back instead of using glutes"], alternatives: ["hip-thrust"] }),
  ex({ slug: "calf-raise", name: "Standing calf raise", primary: "calves", secondary: [], equipment: ["step optional", "dumbbells optional"], difficulty: "beginner", mechanics: "isolation", location: "both", sets: 3, reps: "12-20", rest: 45, met: 3.5, metCode: "02054",
    instructions: ["Balls of feet on a step.", "Rise onto toes, pause, lower below step level."], mistakes: ["Bouncing", "Partial range"], alternatives: ["seated-calf-raise"] }),
  ex({ slug: "seated-calf-raise", name: "Seated calf raise", primary: "calves", secondary: [], equipment: ["machine or dumbbell"], difficulty: "beginner", mechanics: "isolation", location: "both", sets: 3, reps: "15-20", rest: 45, met: 3.5, metCode: "02054",
    instructions: ["Weight on knees, raise heels, lower slowly."], mistakes: ["Bouncing"], alternatives: ["calf-raise"] }),

  // ---- Core ----
  ex({ slug: "plank", name: "Plank", primary: "core", secondary: ["abs", "shoulders"], equipment: [], difficulty: "beginner", mechanics: "isolation", location: "both", sets: 3, reps: "30-60 s", rest: 45, met: 2.8, metCode: "02024",
    instructions: ["Forearms under shoulders, body straight from head to heels.", "Brace abs and glutes; breathe."], mistakes: ["Hips sagging or piking"], alternatives: ["dead-bug", "side-plank"] }),
  ex({ slug: "side-plank", name: "Side plank", primary: "core", secondary: ["abs"], equipment: [], difficulty: "beginner", mechanics: "isolation", location: "both", sets: 3, reps: "20-45 s each", rest: 45, met: 2.8, metCode: "02024",
    instructions: ["Elbow under shoulder, body in a straight line sideways.", "Hold, then switch sides."], mistakes: ["Hips dropping"], alternatives: ["plank"] }),
  ex({ slug: "dead-bug", name: "Dead bug", primary: "core", secondary: ["abs"], equipment: [], difficulty: "beginner", mechanics: "isolation", location: "both", sets: 3, reps: "8-12 each", rest: 45, met: 2.8, metCode: "02024",
    instructions: ["On back, arms up, knees at 90°.", "Extend opposite arm and leg while keeping lower back flat.", "Alternate."], mistakes: ["Lower back arching"], alternatives: ["plank"] }),
  ex({ slug: "crunch", name: "Crunch", primary: "abs", secondary: [], equipment: [], difficulty: "beginner", mechanics: "isolation", location: "both", sets: 3, reps: "15-20", rest: 45, met: 2.8, metCode: "02024",
    instructions: ["Knees bent, hands by ears.", "Curl shoulders off the floor, exhale.", "Lower slowly."], mistakes: ["Pulling on the neck"], alternatives: ["cable-crunch", "dead-bug"] }),
  ex({ slug: "hanging-leg-raise", name: "Hanging leg raise", primary: "abs", secondary: ["forearms"], equipment: ["pull-up bar"], difficulty: "advanced", mechanics: "isolation", location: "both", sets: 3, reps: "8-12", rest: 60, met: 3.8, metCode: "02022",
    instructions: ["Hang from a bar.", "Raise legs by curling the pelvis up.", "Lower without swinging."], mistakes: ["Swinging", "Only lifting the legs without pelvic curl"], alternatives: ["lying-leg-raise"] }),
  ex({ slug: "lying-leg-raise", name: "Lying leg raise", primary: "abs", secondary: [], equipment: [], difficulty: "beginner", mechanics: "isolation", location: "home", sets: 3, reps: "10-15", rest: 45, met: 2.8, metCode: "02024",
    instructions: ["Lie flat, hands under hips.", "Raise straight legs to vertical, lower slowly without touching the floor."], mistakes: ["Lower back arching"], alternatives: ["hanging-leg-raise", "dead-bug"] }),
  ex({ slug: "cable-crunch", name: "Cable crunch", primary: "abs", secondary: [], equipment: ["cable machine"], difficulty: "intermediate", mechanics: "isolation", location: "gym", sets: 3, reps: "10-15", rest: 60, met: 3.5, metCode: "02054",
    instructions: ["Kneel, rope by head.", "Crunch down by flexing the spine.", "Return slowly."], mistakes: ["Pulling with arms", "Hip hinging instead of crunching"], alternatives: ["crunch"] }),
  ex({ slug: "russian-twist", name: "Russian twist", primary: "abs", secondary: ["core"], equipment: ["weight optional"], difficulty: "beginner", mechanics: "isolation", location: "both", sets: 3, reps: "20 total", rest: 45, met: 2.8, metCode: "02024",
    instructions: ["Sit leaning back, feet up or down.", "Rotate the torso side to side."], mistakes: ["Rounded back", "Moving only the arms"], alternatives: ["side-plank"] }),
  ex({ slug: "mountain-climber", name: "Mountain climbers", primary: "core", secondary: ["shoulders", "quadriceps"], equipment: [], difficulty: "beginner", mechanics: "compound", location: "both", sets: 3, reps: "30-45 s", rest: 30, met: 11.0, metCode: "02214",
    instructions: ["High plank.", "Drive knees toward chest alternately at pace."], mistakes: ["Hips bouncing high"], alternatives: ["plank"] }),

  // ---- Full body / conditioning ----
  ex({ slug: "burpee", name: "Burpee", primary: "full_body", secondary: ["chest", "quadriceps", "core"], equipment: [], difficulty: "intermediate", mechanics: "compound", location: "both", sets: 4, reps: "8-15", rest: 45, met: 11.0, metCode: "02214",
    instructions: ["Squat, hands to floor, jump feet back to plank.", "Optional push-up, jump feet in, jump up."], mistakes: ["Sagging hips in plank", "Landing stiff-legged"], alternatives: ["squat-thrust", "jump-squat"] }),
  ex({ slug: "squat-thrust", name: "Squat thrust (no jump)", primary: "full_body", secondary: ["core"], equipment: [], difficulty: "beginner", mechanics: "compound", location: "both", sets: 3, reps: "10-12", rest: 45, met: 7.5, metCode: "02020",
    instructions: ["Squat, step feet back to plank, step back in, stand."], mistakes: ["Rounding the back"], alternatives: ["burpee"] }),
  ex({ slug: "jump-squat", name: "Jump squat", primary: "quadriceps", secondary: ["glutes", "calves"], equipment: [], difficulty: "intermediate", mechanics: "compound", location: "both", sets: 3, reps: "10-15", rest: 60, met: 11.0, metCode: "02214",
    instructions: ["Squat down, explode upward.", "Land softly and descend into the next rep."], mistakes: ["Knees caving on landing"], alternatives: ["bodyweight-squat"] }),
  ex({ slug: "jumping-jacks", name: "Jumping jacks", primary: "full_body", secondary: ["calves"], equipment: [], difficulty: "beginner", mechanics: "compound", location: "both", sets: 3, reps: "30-60 s", rest: 30, met: 7.5, metCode: "02020",
    instructions: ["Jump feet out while raising arms overhead, return."], mistakes: ["Landing on heels"], alternatives: ["high-knees"] }),
  ex({ slug: "high-knees", name: "High knees", primary: "full_body", secondary: ["core", "calves"], equipment: [], difficulty: "beginner", mechanics: "compound", location: "both", sets: 3, reps: "30 s", rest: 30, met: 11.0, metCode: "02214",
    instructions: ["Run in place driving knees to hip height."], mistakes: ["Leaning back"], alternatives: ["jumping-jacks"] }),
  ex({ slug: "kettlebell-swing", name: "Kettlebell swing", primary: "glutes", secondary: ["hamstrings", "core", "back"], equipment: ["kettlebell"], difficulty: "intermediate", mechanics: "compound", location: "both", sets: 4, reps: "15-20", rest: 60, met: 7.5, metCode: "02040",
    instructions: ["Hike the bell back between the legs.", "Snap the hips forward to float the bell to chest height."], mistakes: ["Squatting the swing", "Lifting with the arms"], alternatives: ["romanian-deadlift", "glute-bridge"] }),
  ex({ slug: "battle-ropes", name: "Battle ropes", primary: "full_body", secondary: ["shoulders", "core"], equipment: ["battle ropes"], difficulty: "intermediate", mechanics: "compound", location: "gym", sets: 4, reps: "20-30 s", rest: 40, met: 7.5, metCode: "02020",
    instructions: ["Athletic stance, make alternating waves."], mistakes: ["Standing upright with locked knees"], alternatives: ["jumping-jacks"] }),
  ex({ slug: "skipping", name: "Jump rope", primary: "calves", secondary: ["full_body"], equipment: ["skipping rope"], difficulty: "beginner", mechanics: "compound", location: "both", sets: 5, reps: "60 s", rest: 30, met: 11.8, metCode: "15551",
    instructions: ["Small hops on the balls of the feet, wrists turn the rope."], mistakes: ["Jumping too high", "Swinging from shoulders"], alternatives: ["jumping-jacks"] }),
  ex({ slug: "surya-namaskar", name: "Surya Namaskar (sun salutation)", primary: "full_body", secondary: ["core", "shoulders", "hamstrings"], equipment: ["mat"], difficulty: "beginner", mechanics: "compound", location: "home", sets: 1, reps: "6-12 rounds", rest: 30, met: 3.5, metCode: "02180",
    instructions: ["Flow through the 12 positions: pranamasana, hasta uttanasana, padahastasana, ashwa sanchalanasana, dandasana, ashtanga namaskara, bhujangasana, adho mukha svanasana, and back.", "Coordinate each movement with breath."], mistakes: ["Rushing without breath", "Collapsing lower back in bhujangasana"], alternatives: ["plank", "bodyweight-squat"] }),
];
