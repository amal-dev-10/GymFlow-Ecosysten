const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const systemCategories = [
  // 1. Categories
  { type: "Category", name: "Strength Training", description: "Resistance-based exercise designed to build muscular strength.", icon: "Dumbbell" },
  { type: "Category", name: "Cardio", description: "Aerobic exercises aimed at improving cardiovascular stamina.", icon: "Activity" },
  { type: "Category", name: "Functional Training", description: "Movement patterns mirroring real-world daily actions.", icon: "Sliders" },
  { type: "Category", name: "Powerlifting", description: "Focusing on Squat, Bench Press, and Deadlift power.", icon: "Zap" },
  { type: "Category", name: "Olympic Lifting", description: "Clean & Jerk and Snatch technical explosive lifts.", icon: "Target" },
  { type: "Category", name: "Bodybuilding", description: "Hypertrophy-focused training aimed at muscle growth.", icon: "User" },
  { type: "Category", name: "HIIT", description: "High Intensity Interval Training for rapid caloric burn.", icon: "Sparkles" },
  { type: "Category", name: "Mobility", description: "Focusing on range of motion and joint health.", icon: "RefreshCw" },
  { type: "Category", name: "Flexibility", description: "Stretching routines to improve muscle length.", icon: "Compass" },
  { type: "Category", name: "Rehabilitation", description: "Injury recovery and corrective exercises.", icon: "Heart" },

  // 2. Muscles
  { type: "Muscle", name: "Chest", description: "Pectoralis major and minor chest muscle group." },
  { type: "Muscle", name: "Back", description: "Latissimus dorsi, rhomboids, traps, and erectors." },
  { type: "Muscle", name: "Shoulders", description: "Anterior, lateral, and posterior deltoids." },
  { type: "Muscle", name: "Biceps", description: "Biceps brachii front arm muscles." },
  { type: "Muscle", name: "Triceps", description: "Triceps brachii back arm muscles." },
  { type: "Muscle", name: "Forearms", description: "Forearm flexors and extensors grip muscles." },
  { type: "Muscle", name: "Core", description: "Rectus abdominis, obliques, and transverse abs." },
  { type: "Muscle", name: "Glutes", description: "Gluteus maximus, medius, and minimus." },
  { type: "Muscle", name: "Quadriceps", description: "Front thigh muscle group." },
  { type: "Muscle", name: "Hamstrings", description: "Back thigh muscle group." },
  { type: "Muscle", name: "Calves", description: "Gastrocnemius and soleus lower leg muscles." },
  { type: "Muscle", name: "Neck", description: "Splenius, levator, and traps neck support." },
  { type: "Muscle", name: "Full Body", description: "Exercises engaging multiple major muscle groups." },

  // 3. Equipment
  { type: "Equipment", name: "Bodyweight", description: "No equipment required; uses body gravity resistance." },
  { type: "Equipment", name: "Barbell", description: "Standard olympic or curl barbell bars." },
  { type: "Equipment", name: "Dumbbell", description: "Handheld free weights." },
  { type: "Equipment", name: "EZ Bar", description: "Cambered bar to relieve wrist pressure during curls." },
  { type: "Equipment", name: "Cable Machine", description: "Pulley systems providing constant load tension." },
  { type: "Equipment", name: "Smith Machine", description: "Barbell locked within a linear vertical track." },
  { type: "Equipment", name: "Leg Press", description: "Lower body sled press machine." },
  { type: "Equipment", name: "Kettlebell", description: "Cast-iron weights with top handles." },
  { type: "Equipment", name: "Resistance Band", description: "Elastic bands providing dynamic variable resistance." },
  { type: "Equipment", name: "TRX", description: "Suspension harness straps." },
  { type: "Equipment", name: "Pull-Up Bar", description: "Overhead bar for hanging and vertical pulling." },
  { type: "Equipment", name: "Bench", description: "Flat, incline, or adjustable workout bench." },

  // 4. Exercise Types
  { type: "ExerciseType", name: "Compound", description: "Multi-joint movements engaging several muscle groups." },
  { type: "ExerciseType", name: "Isolation", description: "Single-joint movements targeting a single muscle." },
  { type: "ExerciseType", name: "Assisted", description: "Leveraged machine or band help to decrease load." },
  { type: "ExerciseType", name: "Unilateral", description: "Single-sided exercises (e.g. single-leg squat)." },
  { type: "ExerciseType", name: "Bilateral", description: "Double-sided movements (e.g. barbell bench press)." },

  // 5. Difficulty Levels
  { type: "Difficulty", name: "Beginner", description: "Ideal for novices with little to no training experience.", color: "green" },
  { type: "Difficulty", name: "Intermediate", description: "Requires established lifting form and moderate stamina.", color: "blue" },
  { type: "Difficulty", name: "Advanced", description: "High technical skill and advanced heavy load tolerances.", color: "orange" },
  { type: "Difficulty", name: "Elite", description: "Pro athlete levels, complex lifting methods, peak physical limits.", color: "red" },

  // 6. Movement Patterns
  { type: "MovementPattern", name: "Push", description: "Pressing weight away from chest or shoulders." },
  { type: "MovementPattern", name: "Pull", description: "Drawing resistance closer to body or pulling body up." },
  { type: "MovementPattern", name: "Squat", description: "Triple flexion of hips, knees, and ankles." },
  { type: "MovementPattern", name: "Hinge", description: "Posterior hip hinge spine loading (e.g. Deadlift)." },
  { type: "MovementPattern", name: "Lunge", description: "Split stance legs training." },
  { type: "MovementPattern", name: "Carry", description: "Locomotion under load (e.g. Farmer Walk)." },
  { type: "MovementPattern", name: "Core Stability", description: "Static anti-extension or flexion bracing." },

  // 7. Body Regions
  { type: "BodyRegion", name: "Upper Body", description: "Chest, Back, Shoulders, Arms, Neck." },
  { type: "BodyRegion", name: "Lower Body", description: "Glutes, Quads, Hamstrings, Calves." },
  { type: "BodyRegion", name: "Core", description: "Abdominals, lower back, pelvic floor." },
  { type: "BodyRegion", name: "Full Body", description: "All regions engaged in dynamic synergy." },

  // 8. Tags
  { type: "Tag", name: "Strength", color: "blue" },
  { type: "Tag", name: "Fat Loss", color: "rose" },
  { type: "Tag", name: "Mass Gain", color: "emerald" },
  { type: "Tag", name: "Home Workout", color: "purple" },
  { type: "Tag", name: "Athlete Approved", color: "orange" },
  { type: "Tag", name: "Beginner Friendly", color: "sky" }
];

async function main() {
  console.log('Seeding Master Metadata...');

  // Get active organization (Titan Fitness)
  const org = await prisma.organization.findFirst({
    where: { name: { contains: 'Titan' } }
  });

  if (!org) {
    console.error('Titan Fitness organization not found. Make sure to run populate.js first!');
    return;
  }

  // Clear existing metadata
  const deleted = await prisma.metadataItem.deleteMany({});
  console.log(`Cleared ${deleted.count} metadata items.`);

  // 1. Seed System Presets (organizationId: null, isSystem: true)
  for (const item of systemCategories) {
    await prisma.metadataItem.create({
      data: {
        ...item,
        isSystem: true,
        organizationId: null,
        status: "Active"
      }
    });
  }
  console.log(`Seeded ${systemCategories.length} System-wide default metadata presets.`);

  // 2. Seed Organization-specific Custom Metadata (organizationId: Titan, isSystem: false)
  const customItems = [
    { type: "Category", name: "CrossFit Elite", description: "High-intensity functional fitness customized for athletes.", icon: "Sparkles" },
    { type: "Equipment", name: "Assault AirBike", description: "Dual-action fan bike providing infinite wind resistance.", icon: "Activity" },
    { type: "Tag", name: "Downtown Member Special", color: "violet" },
    { type: "Category", name: "Pecs", description: "Duplicate chest category to test Merging capability.", icon: "User" }
  ];

  for (const item of customItems) {
    await prisma.metadataItem.create({
      data: {
        ...item,
        isSystem: false,
        organizationId: org.id,
        status: "Active"
      }
    });
  }
  console.log(`Seeded ${customItems.length} Custom metadata items for organization ${org.name}.`);

  // 3. Update Exercise linkage counters to match seeded exercise names
  // Let's check how many exercises in the database match each type and set the usageCount
  const exercises = await prisma.exercise.findMany();
  console.log(`Iterating ${exercises.length} exercises to update usage counts...`);

  const metadataItems = await prisma.metadataItem.findMany();
  for (const item of metadataItems) {
    let count = 0;
    exercises.forEach(ex => {
      if (item.type === 'Category' && ex.category === item.name) count++;
      if (item.type === 'Muscle' && (ex.primaryMuscle === item.name || ex.secondaryMuscles.includes(item.name))) count++;
      if (item.type === 'Equipment' && ex.equipment === item.name) count++;
      if (item.type === 'Difficulty' && ex.difficulty === item.name) count++;
      if (item.type === 'MovementPattern' && ex.movementPattern === item.name) count++;
    });

    await prisma.metadataItem.update({
      where: { id: item.id },
      data: { usageCount: count }
    });
  }

  console.log('Metadata counters updated successfully.');
  console.log('Exercise Categories & Metadata seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
