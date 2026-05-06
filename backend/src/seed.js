const prisma = require("./db");

async function main() {
  console.log("Seeding database...");

  // Create levels (upsert to avoid duplicates on re-run)
  await prisma.level.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "Right Angles", difficulty: "beginner" },
  });

  await prisma.level.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: "Tricky Angles", difficulty: "intermediate" },
  });

  console.log("Seeding complete. Levels created:");
  const levels = await prisma.level.findMany();
  console.log(levels);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });