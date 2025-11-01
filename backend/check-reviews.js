import { prisma, connectDatabase } from "./db.js";

async function checkReviews() {
  try {
    await connectDatabase();

    console.log("\nChecking database for code reviews...\n");

    const reviews = await prisma.codeReview.findMany({
      include: {
        issues: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    console.log(`Found ${reviews.length} code reviews in database:\n`);

    if (reviews.length === 0) {
      console.log("No code reviews found! The database is empty.");
      console.log("\nTo populate the database, you need to:");
      console.log("1. Make some changes to your code");
      console.log("2. Stage them with `git add .`");
      console.log(
        "3. Run a code review analysis via the API or pre-commit hook"
      );
    } else {
      reviews.forEach((review, index) => {
        console.log(`   Review #${index + 1}:`);
        console.log(`      ID: ${review.id}`);
        console.log(`      User: ${review.user.name} (ID: ${review.userId})`);
        console.log(`      Branch: ${review.branch}`);
        console.log(`      Status: ${review.status}`);
        console.log(`      Files Analyzed: ${review.filesAnalyzed}`);
        console.log(`      Issues Found: ${review.issuesFound}`);
        console.log(`      Created: ${review.createdAt}`);
        console.log("");
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkReviews();
