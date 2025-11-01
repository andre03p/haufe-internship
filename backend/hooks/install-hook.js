#!/usr/bin/env node

/**
 * Git Hook Installer
 * Installs the pre-commit hook for automated code review
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

try {
  log("\n🔧 Installing Git Pre-commit Hook...", "blue");
  log("━".repeat(50), "blue");

  // Find git root
  const gitRoot = execSync("git rev-parse --show-toplevel", {
    encoding: "utf-8",
  }).trim();
  const hooksDir = path.join(gitRoot, ".git", "hooks");
  const hookPath = path.join(hooksDir, "pre-commit");
  const sourceHook = path.join(__dirname, "pre-commit.js");

  // Check if hooks directory exists
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }

  // Backup existing hook if present
  if (fs.existsSync(hookPath)) {
    const backupPath = `${hookPath}.backup.${Date.now()}`;
    fs.copyFileSync(hookPath, backupPath);
    log(`\n⚠️  Backed up existing hook to: ${backupPath}`, "yellow");
  }

  // Copy the hook
  fs.copyFileSync(sourceHook, hookPath);

  // Make executable (Unix-like systems)
  if (process.platform !== "win32") {
    fs.chmodSync(hookPath, "755");
  }

  log("\n✅ Pre-commit hook installed successfully!", "green");
  log("\n📝 Configuration:", "blue");
  log(`   Hook location: ${hookPath}`, "reset");
  log(
    `   Backend URL: ${
      process.env.CODE_REVIEW_BACKEND || "http://localhost:5000"
    }`,
    "reset"
  );
  log(`   User ID: ${process.env.CODE_REVIEW_USER_ID || "1"}`, "reset");

  log("\n💡 Environment Variables (optional):", "yellow");
  log(
    "   CODE_REVIEW_BACKEND - Backend URL (default: http://localhost:5000)",
    "reset"
  );
  log("   CODE_REVIEW_USER_ID - Your user ID (default: 1)", "reset");
  log('   SKIP_CODE_REVIEW - Set to "true" to disable review', "reset");

  log("\n🚀 Usage:", "green");
  log("   The hook will automatically run before each commit.", "reset");
  log("   To skip: git commit --no-verify", "reset");

  log("\n━".repeat(50), "blue");
  log("✨ Setup complete!\n", "green");
} catch (error) {
  log("\n❌ Installation failed:", "red");
  log(`   ${error.message}`, "red");
  log("\n   Make sure you are in a Git repository.\n", "yellow");
  process.exit(1);
}
