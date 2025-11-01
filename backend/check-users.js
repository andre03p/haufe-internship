import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log("🔍 Checking database users...\n");
    
    const existingUsers = await prisma.user.findMany({
      orderBy: { id: 'asc' }
    });
    
    console.log(`Found ${existingUsers.length} users in database:\n`);
    
    if (existingUsers.length > 0) {
      existingUsers.forEach(user => {
        console.log(`   ✅ ID: ${user.id}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Name: ${user.name}`);
        console.log(`      Created: ${user.createdAt}\n`);
      });
    } else {
      console.log("   ⚠️  No users found in database!");
      console.log("\n🌱 Creating default user...");
      
      const user = await prisma.user.create({
        data: {
          email: "developer@haufe.com",
          name: "Default Developer",
        },
      });
      
      console.log("✅ User created successfully!");
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
    }
    
    // Check if user ID 3 exists
    const user3 = await prisma.user.findUnique({
      where: { id: 3 }
    });
    
    if (user3) {
      console.log(`✅ User ID 3 exists: ${user3.email}`);
      console.log(`   This matches CODE_REVIEW_USER_ID in .env`);
    } else {
      console.log(`❌ User ID 3 NOT FOUND!`);
      console.log(`   Your .env has CODE_REVIEW_USER_ID=3 but this user doesn't exist`);
      console.log(`   Update .env to use an existing user ID`);
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
