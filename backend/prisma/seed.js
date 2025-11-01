import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default user
  const user = await prisma.user.upsert({
    where: { email: "developer@haufe.com" },
    update: {},
    create: {
      email: "developer@haufe.com",
      name: "Default Developer",
    },
  });

  console.log("✅ Created user:", user);
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Name: ${user.name}`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
