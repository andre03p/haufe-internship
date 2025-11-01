#!/usr/bin/env node

/**
 * Pre-commit Hook for Automated Code Review
 *
 * This script runs before each commit to analyze staged changes
 * and provide AI-powered code review insights.
 *
 * Installation:
 * 1. Copy this file to .git/hooks/pre-commit
 * 2. Make it executable: chmod +x .git/hooks/pre-commit
 * 3. Configure the backend URL in your environment
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Load .env file from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = execSync("git rev-parse --show-toplevel", {
  encoding: "utf-8",
}).trim();

const envPath = path.join(repoRoot, "backend", ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith("#")) {
      const [key, ...valueParts] = trimmedLine.split("=");
      if (key && valueParts.length > 0) {
        const value = valueParts.join("=").replace(/^["']|["']$/g, "");
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value.trim();
        }
      }
    }
  });
}

const BACKEND_URL = process.env.CODE_REVIEW_BACKEND || "http://localhost:5000";
const USER_ID = process.env.CODE_REVIEW_USER_ID || "1";
const SKIP_REVIEW = process.env.SKIP_CODE_REVIEW === "true";

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkStagedChanges() {
  try {
    const status = execSync("git diff --cached --name-only", {
      encoding: "utf-8",
    });
    return status.trim().length > 0;
  } catch (error) {
    return false;
  }
}

function makeRequest(url, method = "GET", data = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === "https:" ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers["Content-Length"] = Buffer.byteLength(jsonData);
    }

    const req = protocol.request(options, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: body });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function runCodeReview() {
  try {
    log("\nRunning automated code review...", "cyan");
    log("━".repeat(50), "blue");

    // Check if backend is available
    try {
      const healthCheck = await makeRequest(`${BACKEND_URL}/health`);
      if (healthCheck.statusCode !== 200) {
        throw new Error("Backend not available");
      }

      // Check AI service status (it's under 'ai' not 'llm')
      const currentProvider =
        healthCheck.data?.ai?.currentProvider || "unknown";
      const aiProviderStatus = healthCheck.data?.ai?.[currentProvider]?.status;

      // if (aiProviderStatus !== "ok") {
      //   log(
      //     `\n⚠️  Warning: AI service (${currentProvider}) may not be fully operational`,
      //     "yellow"
      //   );
      //   if (healthCheck.data?.ai?.[currentProvider]?.message) {
      //     log(`   ${healthCheck.data.ai[currentProvider].message}`, "yellow");
      //   }
      // } else {
      //   log(`\n✓ AI service ready (using ${currentProvider})`, "green");
      // }
    } catch (error) {
      log("\nError: Cannot connect to code review backend", "red");
      log(`   Make sure the backend is running at ${BACKEND_URL}`, "yellow");
      log("   Or set SKIP_CODE_REVIEW=true to bypass this check\n", "yellow");
      process.exit(1);
    }

    // Get repository path
    const repoPath = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
    }).trim();

    // Trigger analysis
    log("\nAnalyzing staged changes...", "blue");
    const response = await makeRequest(
      `${BACKEND_URL}/api/reviews/analyze-staged`,
      "POST",
      {
        repositoryPath: repoPath,
        userId: parseInt(USER_ID),
      }
    );

    if (response.statusCode !== 200) {
      log("\nAnalysis failed", "red");
      log(`   ${response.data?.error || "Unknown error"}`, "red");
      process.exit(1);
    }

    const { review } = response.data;

    // Display results
    log("\nAnalysis Complete!", "green");
    log("━".repeat(50), "blue");

    log(`\nFiles analyzed: ${review.filesAnalyzed}`, "cyan");
    log(`Analysis time: ${review.analysisTime?.toFixed(2)}s`, "cyan");
    log(`Tokens used: ${review.tokensUsed}`, "cyan");

    if (review.estimatedEffort) {
      log(
        `⏱️  Estimated effort: ${review.estimatedEffort.toFixed(1)}h`,
        "cyan"
      );
    }

    // Display issues summary
    log("\n📋 Issues Found:", "yellow");
    log(
      `   🔴 Critical: ${review.criticalIssues}`,
      review.criticalIssues > 0 ? "red" : "green"
    );
    log(
      `   🟡 Major: ${review.majorIssues}`,
      review.majorIssues > 0 ? "yellow" : "green"
    );
    log(
      `   🟢 Minor: ${review.minorIssues}`,
      review.minorIssues > 0 ? "blue" : "green"
    );
    log(`   📊 Total: ${review.issuesFound}`, "cyan");

    // Display critical and major issues
    if (review.issues && review.issues.length > 0) {
      const criticalAndMajor = review.issues.filter(
        (i) => i.severity === "CRITICAL" || i.severity === "MAJOR"
      );

      if (criticalAndMajor.length > 0) {
        log("\n⚠️  Important Issues:", "yellow");
        log("━".repeat(50), "yellow");

        criticalAndMajor.slice(0, 5).forEach((issue, index) => {
          const icon = issue.severity === "CRITICAL" ? "🔴" : "🟡";
          log(`\n${icon} [${issue.severity}] ${issue.title}`, "yellow");
          log(`   📄 ${issue.filePath}:${issue.lineNumber}`, "blue");
          log(`   💡 ${issue.description}`, "reset");
          if (issue.suggestion) {
            log(`   ✨ Suggestion: ${issue.suggestion}`, "green");
          }
        });

        if (criticalAndMajor.length > 5) {
          log(`\n... and ${criticalAndMajor.length - 5} more issues`, "yellow");
        }
      }
    }

    log("\n━".repeat(50), "blue");
    log(`\n📊  report: ${BACKEND_URL}/reviews/${review.id}`, "cyan");
    log(`🔗 Review ID: ${review.id}`, "cyan");

    // Decision point
    if (review.criticalIssues > 0) {
      log("\n⛔ COMMIT BLOCKED: Critical issues found!", "red");
      log("   Please fix critical issues before committing.", "yellow");
      log("   Or use: git commit --no-verify to skip this check\n", "yellow");
      process.exit(1);
    }

    if (review.majorIssues > 0) {
      log("\n⚠️  Warning: Major issues found!", "yellow");
      log("   Consider fixing these issues before committing.", "yellow");
      log("   Proceeding with commit...\n", "green");
    }

    if (review.issuesFound === 0) {
      log("\n🎉 No issues found! Great job!", "green");
      log("   Proceeding with commit...\n", "green");
    }

    process.exit(0);
  } catch (error) {
    log("\n❌ Code review failed:", "red");
    log(`   ${error.message}`, "red");
    log("\n   Use: git commit --no-verify to skip this check\n", "yellow");
    process.exit(1);
  }
}

// Main execution
(async () => {
  if (SKIP_REVIEW) {
    log("\n⏭️  Skipping code review (SKIP_CODE_REVIEW=true)\n", "yellow");
    process.exit(0);
  }

  if (!checkStagedChanges()) {
    log("\n⚠️  No staged changes found", "yellow");
    process.exit(0);
  }

  await runCodeReview();
})();
