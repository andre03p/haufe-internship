import fetch from "node-fetch";

const API_BASE = "http://localhost:5000";

// Test configuration
const TEST_CONFIG = {
  userId: 1,
  repositoryPath: "C:/Users/Andreea/Desktop/haufe-internship/haufe-internship", // Update this to your repo path
};

async function testHealth() {
  console.log("\n🔍 Testing Health Endpoint...");
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    console.log("✅ Health:", JSON.stringify(data, null, 2));
    return data.llm.status === "ok";
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
    return false;
  }
}

async function testSeedStandards() {
  console.log("\n🌱 Seeding Coding Standards...");
  try {
    const res = await fetch(`${API_BASE}/api/standards/seed`, {
      method: "POST",
    });
    const data = await res.json();
    console.log("✅ Standards seeded:", data.message);
    return true;
  } catch (error) {
    console.error("❌ Seed standards failed:", error.message);
    return false;
  }
}

async function testGetStandards() {
  console.log("\n📋 Getting Coding Standards...");
  try {
    const res = await fetch(`${API_BASE}/api/standards`);
    const data = await res.json();
    console.log(`✅ Found ${data.standards.length} standards`);
    data.standards.forEach((s) => {
      console.log(`   - ${s.name} (${s.language}) - Active: ${s.isActive}`);
    });
    return true;
  } catch (error) {
    console.error("❌ Get standards failed:", error.message);
    return false;
  }
}

async function testAnalyzeStagedChanges() {
  console.log("\n🔍 Analyzing Staged Changes...");
  console.log(`Repository: ${TEST_CONFIG.repositoryPath}`);
  console.log(`User ID: ${TEST_CONFIG.userId}`);

  try {
    const res = await fetch(`${API_BASE}/api/reviews/analyze-staged`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repositoryPath: TEST_CONFIG.repositoryPath,
        userId: TEST_CONFIG.userId,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Analysis failed:", data.error);
      return false;
    }

    console.log("✅ Analysis complete!");
    console.log(`   Review ID: ${data.review.id}`);
    console.log(`   Files Analyzed: ${data.review.filesAnalyzed}`);
    console.log(`   Issues Found: ${data.review.issuesFound}`);
    console.log(`   Critical: ${data.review.criticalIssues}`);
    console.log(`   Major: ${data.review.majorIssues}`);
    console.log(`   Minor: ${data.review.minorIssues}`);
    console.log(`   Estimated Effort: ${data.review.estimatedEffort} hours`);
    console.log(`   Tokens Used: ${data.review.tokensUsed}`);
    console.log(`   Analysis Time: ${data.review.analysisTime}s`);

    return data.review.id;
  } catch (error) {
    console.error("❌ Analysis failed:", error.message);
    return false;
  }
}

async function testGetReview(reviewId) {
  console.log(`\n📖 Getting Review ${reviewId}...`);
  try {
    const res = await fetch(`${API_BASE}/api/reviews/${reviewId}`);
    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Get review failed:", data.error);
      return false;
    }

    console.log("✅ Review details:");
    console.log(`   Status: ${data.review.status}`);
    console.log(`   Issues: ${data.review.issues.length}`);

    if (data.review.issues.length > 0) {
      console.log("\n   Top Issues:");
      data.review.issues.slice(0, 3).forEach((issue) => {
        console.log(`   - [${issue.severity}] ${issue.title}`);
        console.log(`     File: ${issue.filePath}:${issue.lineNumber}`);
        console.log(`     Category: ${issue.category}`);
      });
    }

    return true;
  } catch (error) {
    console.error("❌ Get review failed:", error.message);
    return false;
  }
}

async function testGetReviews() {
  console.log(`\n📚 Getting All Reviews for User ${TEST_CONFIG.userId}...`);
  try {
    const res = await fetch(
      `${API_BASE}/api/reviews?userId=${TEST_CONFIG.userId}`
    );
    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Get reviews failed:", data.error);
      return false;
    }

    console.log(`✅ Found ${data.reviews.length} reviews`);
    data.reviews.forEach((review) => {
      console.log(
        `   - ${review.id}: ${review.status} (${review.issuesFound} issues)`
      );
    });

    return true;
  } catch (error) {
    console.error("❌ Get reviews failed:", error.message);
    return false;
  }
}

async function testAddComment(reviewId) {
  console.log(`\n💬 Adding Comment to Review ${reviewId}...`);
  try {
    const res = await fetch(`${API_BASE}/api/reviews/${reviewId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: TEST_CONFIG.userId,
        content: "This is a test comment from the test script.",
        type: "COMMENT",
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Add comment failed:", data.error);
      return false;
    }

    console.log("✅ Comment added:", data.comment.content);
    return true;
  } catch (error) {
    console.error("❌ Add comment failed:", error.message);
    return false;
  }
}

async function testGetStats() {
  console.log(`\n📊 Getting Statistics for User ${TEST_CONFIG.userId}...`);
  try {
    const res = await fetch(
      `${API_BASE}/api/reviews/stats/${TEST_CONFIG.userId}`
    );
    const data = await res.json();

    if (!res.ok) {
      console.error("❌ Get stats failed:", data.error);
      return false;
    }

    console.log("✅ Statistics:");
    console.log(`   Total Reviews: ${data.stats.totalReviews}`);
    console.log(`   Total Issues: ${data.stats.totalIssues}`);
    console.log(`   Critical: ${data.stats.totalCritical}`);
    console.log(`   Major: ${data.stats.totalMajor}`);
    console.log(`   Minor: ${data.stats.totalMinor}`);
    console.log(`   Total Tokens: ${data.stats.totalTokens}`);
    console.log(`   Avg Analysis Time: ${data.stats.avgAnalysisTime}s`);

    return true;
  } catch (error) {
    console.error("❌ Get stats failed:", error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log("🚀 Starting API Tests...");
  console.log("=".repeat(60));

  // Test health
  const healthOk = await testHealth();
  if (!healthOk) {
    console.error("\n❌ Server or Ollama not ready. Please check:");
    console.error("   1. Server is running (npm run dev)");
    console.error("   2. Ollama is running (ollama list)");
    console.error("   3. Model is available (ollama pull llama3.2:latest)");
    return;
  }

  // Seed standards
  await testSeedStandards();

  // Get standards
  await testGetStandards();

  // Test analysis
  console.log("\n⚠️  Make sure you have staged changes in the repository!");
  console.log("   Run: git add . (in your repository)");
  console.log("   Or modify TEST_CONFIG.repositoryPath in this script");

  const reviewId = await testAnalyzeStagedChanges();

  if (reviewId) {
    // Test other endpoints with the created review
    await testGetReview(reviewId);
    await testAddComment(reviewId);
    await testGetReviews();
    await testGetStats();
  }

  console.log("\n=".repeat(60));
  console.log("✅ Tests Complete!");
}

// Run tests
runTests().catch(console.error);
