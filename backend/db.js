import { PrismaClient } from "@prisma/client";

// Create a singleton Prisma Client instance
let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    log: ["error"],
  });
} else {
  // In development, prevent multiple instances during hot-reloading
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: ["query", "error", "warn"],
    });
  }
  prisma = global.prisma;
}

// Connect to database
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    throw error;
  }
}

// Disconnect from database
async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    console.log("Database disconnected");
  } catch (error) {
    console.error("Error disconnecting from database:", error);
  }
}

// Health check
async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", message: "Database is responsive" };
  } catch (error) {
    return { status: "error", message: error.message };
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down gracefully...");
  await disconnectDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\nShutting down gracefully...");
  await disconnectDatabase();
  process.exit(0);
});

export { prisma, connectDatabase, disconnectDatabase, checkDatabaseHealth };
export default prisma;
