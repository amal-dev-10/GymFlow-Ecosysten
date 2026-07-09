const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const officialExercises = [
  {
    name: "Barbell Back Squat",
    description: "The king of lower body exercises, targeting the quadriceps, glutes, and hamstrings.",
    category: "Strength",
    primaryMuscle: "Quadriceps",
    secondaryMuscles: ["Glutes", "Hamstrings", "Core"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    movementPattern: "Squat",
    instructions: [
      "Place the barbell on your upper back / traps.",
      "Stand with feet shoulder-width apart, toes slightly flared.",
      "Brace your core, push your hips back, and bend your knees to lower down.",
      "Squat until thighs are parallel to the ground or lower.",
      "Drive through your mid-foot to stand back up to the starting position."
    ],
    safetyTips: ["Keep chest up", "Do not let knees cave inward", "Keep heels flat on the floor"],
    gifUrl: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&q=80&w=300",
    rating: 4.9,
    downloads: 12450,
    verified: true,
    useCount: 1540,
    assignCount: 890,
  },
  {
    name: "Dumbbell Flat Bench Press",
    description: "Classic chest press targeting the pectoralis major, anterior deltoids, and triceps.",
    category: "Strength",
    primaryMuscle: "Chest",
    secondaryMuscles: ["Shoulders", "Triceps"],
    equipment: "Dumbbell",
    difficulty: "Beginner",
    movementPattern: "Push",
    instructions: [
      "Lie flat on a bench holding dumbbells at chest level.",
      "Keep your feet flat on the floor and retract your shoulder blades.",
      "Press the weights upward until arms are extended but not locked.",
      "Lower the dumbbells slowly until they are near the outer chest.",
      "Repeat for the desired number of repetitions."
    ],
    safetyTips: ["Avoid bouncing the weights", "Maintain a slight arch in your lower back", "Keep wrists straight"],
    gifUrl: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&q=80&w=300",
    rating: 4.8,
    downloads: 9800,
    verified: true,
    useCount: 1890,
    assignCount: 920,
  },
  {
    name: "Conventional Deadlift",
    description: "A compound powerhouse focusing on the posterior chain, hamstrings, and lower back.",
    category: "Strength",
    primaryMuscle: "Hamstrings",
    secondaryMuscles: ["Back", "Glutes", "Core", "Forearms"],
    equipment: "Barbell",
    difficulty: "Advanced",
    movementPattern: "Hinge",
    instructions: [
      "Stand with feet hip-width apart, barbell over mid-foot.",
      "Hinge at the hips and bend knees slightly to grasp the bar with a flat back.",
      "Brace core, engage lats, and drive feet into the floor to stand.",
      "Keep the bar close to your body throughout the lift.",
      "Hinge hips back and lower the bar under control to the floor."
    ],
    safetyTips: ["Never round your lower back", "Pull the slack out of the bar before lifting", "Engage your lats"],
    gifUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=300",
    rating: 4.9,
    downloads: 14300,
    verified: true,
    useCount: 2100,
    assignCount: 1050,
  },
  {
    name: "Pull-up",
    description: "Bodyweight back builder targeting the latissimus dorsi, biceps, and core.",
    category: "Flexibility",
    primaryMuscle: "Back",
    secondaryMuscles: ["Biceps", "Forearms", "Core"],
    equipment: "Bodyweight",
    difficulty: "Intermediate",
    movementPattern: "Pull",
    instructions: [
      "Grip the pull-up bar with hands slightly wider than shoulder-width, palms facing away.",
      "Hang with arms fully extended, core engaged.",
      "Pull your shoulder blades down and back, then pull chest toward the bar.",
      "Lead with your chest and pull until chin clears the bar.",
      "Lower yourself with control back to the starting dead-hang."
    ],
    safetyTips: ["Do not swing or use momentum (no kipping)", "Fully extend arms at the bottom", "Engage shoulder blades first"],
    gifUrl: "https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&q=80&w=300",
    rating: 4.7,
    downloads: 8700,
    verified: true,
    useCount: 1100,
    assignCount: 650,
  },
  {
    name: "Kettlebell Swing",
    description: "Hip hinge movement for conditioning and power in the glutes and hamstrings.",
    category: "Functional",
    primaryMuscle: "Glutes",
    secondaryMuscles: ["Hamstrings", "Back", "Core", "Shoulders"],
    equipment: "Kettlebell",
    difficulty: "Intermediate",
    movementPattern: "Hinge",
    instructions: [
      "Stand with feet shoulder-width apart, kettlebell on the floor in front of you.",
      "Hinge at the hips, grasp kettlebell, and tilt it toward you.",
      "Swing the bell back between your legs, then snap hips forward to stand.",
      "Let the bell rise to chest height, driven entirely by hip force.",
      "Guide the bell back down through the legs and repeat."
    ],
    safetyTips: ["This is a hinge, not a squat", "Do not pull with your arms", "Maintain a flat spine"],
    gifUrl: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=300",
    rating: 4.8,
    downloads: 7500,
    verified: true,
    useCount: 890,
    assignCount: 450,
  },
  {
    name: "Treadmill Speed Intervals",
    description: "High-intensity cardiovascular intervals designed to boost endurance.",
    category: "Cardio",
    primaryMuscle: "Full Body",
    secondaryMuscles: ["Calves", "Hamstrings", "Glutes"],
    equipment: "Machine",
    difficulty: "Beginner",
    movementPattern: "Carry",
    instructions: [
      "Warm up at a light jog for 5 minutes.",
      "Sprint at 85% maximum effort for 60 seconds.",
      "Recover with a brisk walk or light jog for 90 seconds.",
      "Repeat the interval cycle 8-10 times.",
      "Cool down for 5 minutes."
    ],
    safetyTips: ["Ensure safety key is attached", "Maintain upright posture", "Gradually adjust speeds"],
    gifUrl: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&q=80&w=300",
    rating: 4.6,
    downloads: 5400,
    verified: true,
    useCount: 650,
    assignCount: 300,
  },
  {
    name: "Cat-Cow Flow",
    description: "Gentle mobility sequence for spinal health and abdominal core flexion.",
    category: "Mobility",
    primaryMuscle: "Core",
    secondaryMuscles: ["Back", "Shoulders"],
    equipment: "Bodyweight",
    difficulty: "Beginner",
    movementPattern: "Hinge",
    instructions: [
      "Start on all fours with wrists directly under shoulders and knees under hips.",
      "Inhale, drop belly toward the mat, lift chest and chin (Cow).",
      "Exhale, pull belly button to spine, round back toward the ceiling (Cat).",
      "Flow between these two shapes matching your breathing rhythm.",
      "Repeat for 10 full breaths."
    ],
    safetyTips: ["Keep movements slow and controlled", "Do not strain the neck", "Listen to spinal limits"],
    gifUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=300",
    rating: 4.7,
    downloads: 4100,
    verified: true,
    useCount: 300,
    assignCount: 200,
  }
];

const externalExercises = [
  {
    name: "Cable Crossover Fly",
    description: "Isolates the chest muscles through constant cable tension.",
    category: "Strength",
    primaryMuscle: "Chest",
    secondaryMuscles: ["Shoulders"],
    equipment: "Cable",
    difficulty: "Intermediate",
    movementPattern: "Push",
    instructions: [
      "Set pulleys to shoulder height. Grip handles and step forward.",
      "With a slight bend in elbows, sweep arms forward to meet in front of chest.",
      "Squeeze chest at peak contraction.",
      "Slowly return to starting stretch position."
    ],
    safetyTips: ["Maintain elbow bend", "Do not press with shoulders"],
    rating: 4.3,
    downloads: 2300,
    verified: false,
    useCount: 420,
    assignCount: 180,
  },
  {
    name: "Dumbbell Lateral Raise",
    description: "Lateral deltoid builder to widen shoulder width.",
    category: "Strength",
    primaryMuscle: "Shoulders",
    secondaryMuscles: ["Triceps"],
    equipment: "Dumbbell",
    difficulty: "Beginner",
    movementPattern: "Push",
    instructions: [
      "Stand holding dumbbells at your sides.",
      "Raise arms out to the sides until parallel to the floor.",
      "Lower with control and repeat."
    ],
    safetyTips: ["Do not swing body", "Lead with elbows"],
    rating: 4.5,
    downloads: 6700,
    verified: false,
    useCount: 1300,
    assignCount: 680,
  },
  {
    name: "Hanging Leg Raise",
    description: "Advanced lower abdominal exercise utilizing a pull-up bar.",
    category: "Strength",
    primaryMuscle: "Core",
    secondaryMuscles: ["Glutes"],
    equipment: "Bodyweight",
    difficulty: "Advanced",
    movementPattern: "Pull",
    instructions: [
      "Hang from a bar with straight arms.",
      "Keeping legs straight, raise them to a 90-degree angle.",
      "Lower slowly to prevent swinging."
    ],
    safetyTips: ["Control the descent", "Avoid using hips momentum"],
    rating: 4.6,
    downloads: 4800,
    verified: false,
    useCount: 920,
    assignCount: 450,
  }
];

const communityExercises = [
  {
    name: "Incline Dumbbell Chest Press",
    description: "Focuses on the upper portion of the pectoral chest muscles.",
    category: "Strength",
    primaryMuscle: "Chest",
    secondaryMuscles: ["Shoulders", "Triceps"],
    equipment: "Dumbbell",
    difficulty: "Beginner",
    movementPattern: "Push",
    instructions: [
      "Set bench to a 30-45 degree incline.",
      "Press dumbbells up from shoulder level.",
      "Lower slowly back to upper chest."
    ],
    safetyTips: ["Do not arch lower back excess", "Keep elbows at 45 degrees"],
    rating: 4.8,
    downloads: 8700,
    creator: "Gold Gym Pro",
    verified: true,
    useCount: 1450,
    assignCount: 780,
  },
  {
    name: "Barbell Glute Hip Thrust",
    description: "The ultimate glute activation and building exercise.",
    category: "Strength",
    primaryMuscle: "Glutes",
    secondaryMuscles: ["Hamstrings", "Core"],
    equipment: "Barbell",
    difficulty: "Intermediate",
    movementPattern: "Hinge",
    instructions: [
      "Sit on the floor with upper back against a bench, bar on hips.",
      "Drive heels down, lift hips until torso is parallel to floor.",
      "Squeeze glutes at top, then lower under control."
    ],
    safetyTips: ["Use a pad on the bar", "Tuck chin slightly forward"],
    rating: 4.9,
    downloads: 9100,
    creator: "Physique Science Labs",
    verified: false,
    useCount: 1250,
    assignCount: 690,
  }
];

async function main() {
  console.log('Seeding Exercise Library...');

  // Get active organization (Titan Fitness)
  const org = await prisma.organization.findFirst({
    where: { name: { contains: 'Titan' } }
  });

  if (!org) {
    console.error('Titan Fitness organization not found. Make sure to run populate.js first!');
    return;
  }
  console.log(`Scoped custom exercises to Organization: ${org.name} (${org.id})`);

  // Clear existing exercises
  const deletedFavorites = await prisma.exerciseFavorite.deleteMany({});
  const deletedExercises = await prisma.exercise.deleteMany({});
  console.log(`Cleared ${deletedExercises.count} exercises and ${deletedFavorites.count} favorites.`);

  // 1. Seed Official Exercises
  for (const ex of officialExercises) {
    await prisma.exercise.create({
      data: {
        ...ex,
        source: 'Official',
      }
    });
  }
  console.log(`Seeded ${officialExercises.length} Official exercises.`);

  // 2. Seed External Exercises
  for (const ex of externalExercises) {
    await prisma.exercise.create({
      data: {
        ...ex,
        source: 'External',
        sourceId: 'ext-' + Math.random().toString(36).substr(2, 9),
      }
    });
  }
  console.log(`Seeded ${externalExercises.length} External exercises.`);

  // 3. Seed Community Exercises
  for (const ex of communityExercises) {
    await prisma.exercise.create({
      data: {
        ...ex,
        source: 'Community',
      }
    });
  }
  console.log(`Seeded ${communityExercises.length} Community exercises.`);

  // 4. Seed Custom Exercises (Organization-scoped)
  const customExercises = [
    {
      name: "Downtown Core Blaster",
      description: "A specialized core circuit customized for members of the Downtown branch.",
      category: "HIIT",
      primaryMuscle: "Core",
      secondaryMuscles: ["Shoulders", "Quadriceps"],
      equipment: "Bodyweight",
      difficulty: "Advanced",
      movementPattern: "Carry",
      instructions: [
        "Perform 30 seconds of high-knees.",
        "Immediately transition into 30 seconds of push-up plank taps.",
        "Rest 15 seconds, then perform 30 seconds of Russian twists.",
        "Repeat for 3 rounds."
      ],
      safetyTips: ["Keep spine neutral during plank", "Breath steadily throughout"],
      visibility: "Private",
      useCount: 150,
      assignCount: 80,
    },
    {
      name: "Uptown Power Cleans",
      description: "Explosive dynamic lifting routine customized for athletes.",
      category: "Olympic Lifting",
      primaryMuscle: "Full Body",
      secondaryMuscles: ["Shoulders", "Glutes", "Quadriceps"],
      equipment: "Barbell",
      difficulty: "Expert",
      movementPattern: "Hinge",
      instructions: [
        "Pull barbell from floor with explosive power.",
        "Catch the bar on front rack position while sinking into a quarter squat.",
        "Stand up fully to lock out rep."
      ],
      safetyTips: ["Ensure core is fully braced", "Keep back straight at pull start"],
      visibility: "Private",
      useCount: 80,
      assignCount: 40,
    }
  ];

  for (const ex of customExercises) {
    await prisma.exercise.create({
      data: {
        ...ex,
        source: 'Custom',
        organizationId: org.id,
      }
    });
  }
  console.log(`Seeded ${customExercises.length} Custom exercises for Titan Fitness.`);

  // 5. Seed some Favorites for the Organization users
  const orgUser = await prisma.organizationUser.findFirst({
    where: { organizationId: org.id },
    include: { user: true }
  });

  if (orgUser) {
    console.log(`Seeding Favorites for user: ${orgUser.user.fullName} (${orgUser.userId})`);
    const allEx = await prisma.exercise.findMany({ take: 3 });
    for (const ex of allEx) {
      await prisma.exerciseFavorite.create({
        data: {
          userId: orgUser.userId,
          exerciseId: ex.id,
        }
      });
    }
    console.log(`Added ${allEx.length} favorite bookmarks.`);
  }

  console.log('Exercise Library seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
