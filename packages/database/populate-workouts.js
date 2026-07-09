const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Workout Templates...');

  // Get active organization (Titan Fitness)
  const org = await prisma.organization.findFirst({
    where: { name: { contains: 'Titan' } }
  });

  if (!org) {
    console.error('Titan Fitness organization not found. Make sure to run populate.js first!');
    return;
  }

  // Clear existing workouts
  const deleted = await prisma.workout.deleteMany({});
  console.log(`Cleared ${deleted.count} existing workouts.`);

  // Find some exercises to link in structures
  const exercises = await prisma.exercise.findMany();
  const getEx = (name) => {
    const found = exercises.find(e => e.name.toLowerCase().includes(name.toLowerCase()));
    return found ? { id: found.id, name: found.name, primaryMuscle: found.primaryMuscle, source: found.source } : { id: 'ex-id', name, primaryMuscle: 'Chest', source: 'Official' };
  };

  const workoutTemplates = [
    {
      name: "Upper Body Hypertrophy",
      type: "Strength",
      difficulty: "Intermediate",
      duration: 60,
      calories: 450,
      visibility: "Organization",
      status: "Published",
      isTemplate: true,
      notes: "High-volume push/pull split focused on chest, back, and shoulders hypertrophy.",
      prepNotes: "Dynamic arm swings and light band pulls for joint warmup.",
      equipmentNotes: "Standard Bench, Dumbbells, Olympic Barbell, and Cable Machine.",
      structure: [
        {
          id: "sec-warmup",
          name: "Warm-Up & Mobility",
          type: "Warm-Up",
          blocks: [
            {
              id: "b1",
              exerciseId: getEx("Jumping Jacks").id,
              name: "Jumping Jacks",
              primaryMuscle: "Full Body",
              source: "Official",
              isWarmup: true,
              isSuperset: false,
              isDropset: false,
              config: { sets: 1, reps: 50, duration: 60, rest: 15, tempo: "Regular", rpe: 4, notes: "Warmup shoulder capsules." }
            }
          ]
        },
        {
          id: "sec-main",
          name: "Primary Lifts",
          type: "Main Workout",
          blocks: [
            {
              id: "b2",
              exerciseId: getEx("Bench Press").id,
              name: getEx("Bench Press").name,
              primaryMuscle: getEx("Bench Press").primaryMuscle,
              source: getEx("Bench Press").source,
              isWarmup: false,
              isSuperset: false,
              isDropset: false,
              config: { sets: 4, reps: 8, weight: 185, rest: 90, tempo: "3-0-1-0", rpe: 8, notes: "Perform 2 warmup sets first." }
            },
            {
              id: "b3",
              exerciseId: getEx("Pullup").id,
              name: getEx("Pullup").name,
              primaryMuscle: getEx("Pullup").primaryMuscle,
              source: getEx("Pullup").source,
              isWarmup: false,
              isSuperset: false,
              isDropset: false,
              config: { sets: 4, reps: 10, weight: 0, rest: 75, tempo: "2-1-1-0", rpe: 7, notes: "Focus on driving elbows to ribs." }
            }
          ]
        },
        {
          id: "sec-accessory",
          name: "Accessory Superset",
          type: "Accessory",
          blocks: [
            {
              id: "b4",
              exerciseId: getEx("Dumbbell Curl").id,
              name: getEx("Dumbbell Curl").name,
              primaryMuscle: getEx("Dumbbell Curl").primaryMuscle,
              source: getEx("Dumbbell Curl").source,
              isWarmup: false,
              isSuperset: true,
              supersetGroupId: "ss1",
              isDropset: false,
              config: { sets: 3, reps: 12, weight: 30, rest: 0, tempo: "3-0-1-0", rpe: 7, notes: "Superset with Tricep Pushdowns." }
            },
            {
              id: "b5",
              exerciseId: getEx("Pushdown").id,
              name: getEx("Pushdown").name || "Cable Tricep Pushdown",
              primaryMuscle: "Triceps",
              source: "Official",
              isWarmup: false,
              isSuperset: true,
              supersetGroupId: "ss1",
              isDropset: false,
              config: { sets: 3, reps: 15, weight: 50, rest: 60, tempo: "2-0-1-0", rpe: 8, notes: "Keep upper arms static." }
            }
          ]
        }
      ]
    },
    {
      name: "HIIT Fat Burner Circuit",
      type: "HIIT",
      difficulty: "Advanced",
      duration: 30,
      calories: 380,
      visibility: "Organization",
      status: "Published",
      isTemplate: true,
      notes: "Cardio conditioning round utilizing full-body plyometrics and short rests.",
      structure: [
        {
          id: "sec-hiit",
          name: "Conditioning Round",
          type: "Conditioning",
          blocks: [
            {
              id: "h1",
              exerciseId: getEx("Kettlebell Swing").id,
              name: getEx("Kettlebell Swing").name || "Kettlebell Swing",
              primaryMuscle: "Hamstrings",
              source: "Official",
              isWarmup: false,
              isSuperset: false,
              isDropset: false,
              config: { sets: 4, reps: 20, duration: 40, rest: 20, tempo: "Explosive", rpe: 8 }
            },
            {
              id: "h2",
              exerciseId: getEx("Burpee").id,
              name: "Burpees",
              primaryMuscle: "Full Body",
              source: "Official",
              isWarmup: false,
              isSuperset: false,
              isDropset: false,
              config: { sets: 4, reps: 15, duration: 40, rest: 20, tempo: "Fast", rpe: 9 }
            }
          ]
        }
      ]
    },
    {
      name: "Beginner Core & Abs Recovery",
      type: "Cardio",
      difficulty: "Beginner",
      duration: 20,
      calories: 120,
      visibility: "Private",
      status: "Draft",
      isTemplate: true,
      notes: "Low impact session targeting core stabilizers and spine alignment.",
      structure: [
        {
          id: "sec-core",
          name: "Isometric Holds",
          type: "Main Workout",
          blocks: [
            {
              id: "c1",
              exerciseId: getEx("Plank").id,
              name: getEx("Plank").name || "Forearm Plank",
              primaryMuscle: "Core",
              source: "Official",
              isWarmup: false,
              isSuperset: false,
              isDropset: false,
              config: { sets: 3, reps: 1, duration: 60, rest: 45, tempo: "Static", rpe: 6, notes: "Engage glutes and keep lower back flat." }
            }
          ]
        }
      ]
    }
  ];

  for (const w of workoutTemplates) {
    const workout = await prisma.workout.create({
      data: {
        organizationId: org.id,
        name: w.name,
        type: w.type,
        difficulty: w.difficulty,
        duration: w.duration,
        calories: w.calories,
        visibility: w.visibility,
        status: w.status,
        isTemplate: w.isTemplate,
        notes: w.notes,
        prepNotes: w.prepNotes,
        equipmentNotes: w.equipmentNotes,
        structure: w.structure,
      }
    });

    // Create a first Version record for history track
    await prisma.workoutVersion.create({
      data: {
        workoutId: workout.id,
        versionNumber: 1,
        name: `Initial Seed - v1`,
        notes: `Created first revision copy of "${w.name}".`,
        structure: w.structure
      }
    });
  }

  console.log(`Seeded ${workoutTemplates.length} workout templates with their versions successfully!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
