import simpleGit from "simple-git";
import parseDiff from "parse-diff";
import path from "path";
import fs from "fs/promises";
import { promisify } from "util";
import { exec } from "child_process";
import aiService from "./aiService.js";
import { prisma } from "../server.js";

const execAsync = promisify(exec);

class CodeAnalysisService {
  constructor() {
    this.supportedExtensions = {
      ".js": "javascript",
      ".jsx": "javascript",
      ".ts": "typescript",
      ".tsx": "typescript",
      ".py": "python",
      ".java": "java",
      ".cpp": "cpp",
      ".c": "c",
      ".cs": "csharp",
      ".go": "go",
      ".rb": "ruby",
      ".php": "php",
      ".rs": "rust",
    };
  }

  /**
   * Analyze staged changes in a repository
   */
  async analyzeStagedChanges(repositoryPath, userId) {
    const startTime = Date.now();
    const git = simpleGit(repositoryPath);

    try {
      // Check if there are staged changes
      const status = await git.status();
      if (status.staged.length === 0 && status.modified.length === 0) {
        throw new Error(
          "No staged or modified changes found. Please stage your changes first using 'git add'."
        );
      }

      // Get current branch
      const branch = await git.branchLocal();
      const currentBranch = branch.current;

      // Create review record
      const review = await prisma.codeReview.create({
        data: {
          userId,
          repositoryPath,
          branch: currentBranch,
          status: "IN_PROGRESS",
        },
      });

      // Get diff of staged changes (or all changes if nothing staged)
      let diff;
      if (status.staged.length > 0) {
        diff = await git.diff(["--cached"]);
      } else {
        // If nothing is staged, analyze modified files
        diff = await git.diff();
      }

      if (!diff || diff.trim() === "") {
        throw new Error(
          "No changes detected in the diff. Please make sure you have uncommitted changes."
        );
      }

      const parsedDiff = parseDiff(diff);

      if (parsedDiff.length === 0) {
        throw new Error(
          "Unable to parse diff. Please check if there are valid code changes."
        );
      }

      // Load active coding standards
      const standards = await this.getActiveStandards();

      let totalTokens = 0;
      const allIssues = [];
      const allRecommendations = {
        documentation: [],
        testing: [],
        architecture: [],
        cicd: [],
      };

      let filesAnalyzed = 0;

      // Analyze each changed file
      for (const file of parsedDiff) {
        if (file.deleted) {
          console.log(`Skipping deleted file: ${file.to}`);
          continue;
        }

        const fileExt = path.extname(file.to);
        const language = this.supportedExtensions[fileExt];

        if (!language) {
          console.log(
            `Skipping unsupported file: ${file.to} (extension: ${fileExt})`
          );
          continue;
        }

        // Extract only added/modified lines
        const changedCode = this.extractChangedCode(file);

        if (!changedCode || changedCode.trim().length < 10) {
          console.log(`Skipping file with minimal changes: ${file.to}`);
          continue;
        }

        filesAnalyzed++;

        try {
          console.log(`Analyzing ${file.to} (${language})...`);

          // Analyze with AI
          const analysis = await aiService.analyzeCode(
            changedCode,
            file.to,
            language,
            standards.filter(
              (s) => s.language === language || s.language === "all"
            )
          );

          totalTokens += analysis.tokensUsed || 0;

          // Collect recommendations
          if (analysis.analysis.recommendations) {
            const recs = analysis.analysis.recommendations;
            if (recs.documentation && Array.isArray(recs.documentation))
              allRecommendations.documentation.push(...recs.documentation);
            if (recs.testing && Array.isArray(recs.testing))
              allRecommendations.testing.push(...recs.testing);
            if (recs.architecture && Array.isArray(recs.architecture))
              allRecommendations.architecture.push(...recs.architecture);
            if (recs.cicd && Array.isArray(recs.cicd))
              allRecommendations.cicd.push(...recs.cicd);
          }

          // Save issues to database
          if (
            analysis.analysis.issues &&
            Array.isArray(analysis.analysis.issues)
          ) {
            for (const issue of analysis.analysis.issues) {
              try {
                const savedIssue = await prisma.codeIssue.create({
                  data: {
                    reviewId: review.id,
                    filePath: file.to,
                    lineNumber: issue.line || 1,
                    lineEnd: issue.lineEnd || issue.line || 1,
                    severity: issue.severity || "INFO",
                    category: issue.category || "style",
                    title: issue.title,
                    description: issue.description,
                    codeSnippet: changedCode.substring(0, 5000), // Limit snippet size
                    suggestion: issue.suggestion || null,
                    autoFixable: issue.autoFixable || false,
                    standard: issue.standard || null,
                    documentationNeeded: issue.documentationNeeded || null,
                  },
                });
                allIssues.push(savedIssue);
              } catch (issueError) {
                console.error(
                  `Failed to save issue: ${issue.title}`,
                  issueError.message
                );
              }
            }
          }
        } catch (error) {
          console.error(`Failed to analyze ${file.to}:`, error.message);
          // Continue with other files even if one fails
        }
      }

      if (filesAnalyzed === 0) {
        // Update review as failed
        await prisma.codeReview.update({
          where: { id: review.id },
          data: {
            status: "FAILED",
          },
        });
        throw new Error(
          "No supported files found to analyze. Make sure you have code files with supported extensions (.js, .jsx, .ts, .tsx, .py, .java, etc.)"
        );
      }

      // Calculate issue counts
      const criticalIssues = allIssues.filter(
        (i) => i.severity === "CRITICAL"
      ).length;
      const majorIssues = allIssues.filter(
        (i) => i.severity === "MAJOR"
      ).length;
      const minorIssues = allIssues.filter(
        (i) => i.severity === "MINOR"
      ).length;

      // Estimate effort
      let estimatedEffort = 0;
      if (allIssues.length > 0) {
        try {
          const effortEstimate = await aiService.estimateEffort(allIssues);
          estimatedEffort = effortEstimate.totalEffort || 0;

          // Update individual issue efforts
          if (
            effortEstimate.breakdown &&
            Array.isArray(effortEstimate.breakdown)
          ) {
            for (const item of effortEstimate.breakdown) {
              const issue = allIssues.find((i) => i.title === item.issue);
              if (issue && item.effort) {
                await prisma.codeIssue.update({
                  where: { id: issue.id },
                  data: { effort: item.effort },
                });
              }
            }
          }
        } catch (error) {
          console.error("Failed to estimate effort:", error.message);
          // Use simple estimation: 0.5 hours per issue
          estimatedEffort = allIssues.length * 0.5;
        }
      }

      // Update review with final stats
      const analysisTime = (Date.now() - startTime) / 1000;
      const updatedReview = await prisma.codeReview.update({
        where: { id: review.id },
        data: {
          status: "COMPLETED",
          filesAnalyzed: filesAnalyzed,
          issuesFound: allIssues.length,
          criticalIssues,
          majorIssues,
          minorIssues,
          estimatedEffort,
          tokensUsed: totalTokens,
          analysisTime,
          recommendations: allRecommendations,
        },
        include: {
          issues: true,
        },
      });

      return updatedReview;
    } catch (error) {
      console.error("Analysis failed:", error);
      // Try to update review as failed if it exists
      try {
        const existingReview = await prisma.codeReview.findFirst({
          where: { userId, repositoryPath },
          orderBy: { createdAt: "desc" },
        });
        if (existingReview && existingReview.status === "IN_PROGRESS") {
          await prisma.codeReview.update({
            where: { id: existingReview.id },
            data: { status: "FAILED" },
          });
        }
      } catch (updateError) {
        console.error("Failed to update review status:", updateError.message);
      }
      throw error;
    }
  }

  /**
   * Analyze specific commit
   */
  async analyzeCommit(repositoryPath, commitHash, userId) {
    const startTime = Date.now();
    const git = simpleGit(repositoryPath);

    try {
      // Verify commit exists
      try {
        await git.show([commitHash, "--format=%H"]);
      } catch (error) {
        throw new Error(`Commit ${commitHash} not found in repository`);
      }

      const branch = await git.branchLocal();
      const currentBranch = branch.current;

      const review = await prisma.codeReview.create({
        data: {
          userId,
          repositoryPath,
          branch: currentBranch,
          commitHash,
          status: "IN_PROGRESS",
        },
      });

      // Get diff for specific commit
      const diff = await git.show([commitHash, "--format="]);

      if (!diff || diff.trim() === "") {
        throw new Error("No changes found in commit");
      }

      const parsedDiff = parseDiff(diff);

      if (parsedDiff.length === 0) {
        throw new Error("Unable to parse commit diff");
      }

      const standards = await this.getActiveStandards();
      let totalTokens = 0;
      const allIssues = [];
      const allRecommendations = {
        documentation: [],
        testing: [],
        architecture: [],
        cicd: [],
      };

      let filesAnalyzed = 0;

      for (const file of parsedDiff) {
        if (file.deleted) {
          console.log(`Skipping deleted file: ${file.to}`);
          continue;
        }

        const fileExt = path.extname(file.to);
        const language = this.supportedExtensions[fileExt];

        if (!language) {
          console.log(`Skipping unsupported file: ${file.to}`);
          continue;
        }

        const changedCode = this.extractChangedCode(file);
        if (!changedCode || changedCode.trim().length < 10) {
          console.log(`Skipping file with minimal changes: ${file.to}`);
          continue;
        }

        filesAnalyzed++;

        try {
          console.log(`Analyzing ${file.to} (${language})...`);

          const analysis = await aiService.analyzeCode(
            changedCode,
            file.to,
            language,
            standards.filter(
              (s) => s.language === language || s.language === "all"
            )
          );

          totalTokens += analysis.tokensUsed || 0;

          // Collect recommendations
          if (analysis.analysis.recommendations) {
            const recs = analysis.analysis.recommendations;
            if (recs.documentation && Array.isArray(recs.documentation))
              allRecommendations.documentation.push(...recs.documentation);
            if (recs.testing && Array.isArray(recs.testing))
              allRecommendations.testing.push(...recs.testing);
            if (recs.architecture && Array.isArray(recs.architecture))
              allRecommendations.architecture.push(...recs.architecture);
            if (recs.cicd && Array.isArray(recs.cicd))
              allRecommendations.cicd.push(...recs.cicd);
          }

          if (
            analysis.analysis.issues &&
            Array.isArray(analysis.analysis.issues)
          ) {
            for (const issue of analysis.analysis.issues) {
              try {
                const savedIssue = await prisma.codeIssue.create({
                  data: {
                    reviewId: review.id,
                    filePath: file.to,
                    lineNumber: issue.line || 1,
                    lineEnd: issue.lineEnd || issue.line || 1,
                    severity: issue.severity || "INFO",
                    category: issue.category || "style",
                    title: issue.title,
                    description: issue.description,
                    codeSnippet: changedCode.substring(0, 5000),
                    suggestion: issue.suggestion || null,
                    autoFixable: issue.autoFixable || false,
                    standard: issue.standard || null,
                    documentationNeeded: issue.documentationNeeded || null,
                  },
                });
                allIssues.push(savedIssue);
              } catch (issueError) {
                console.error(
                  `Failed to save issue: ${issue.title}`,
                  issueError.message
                );
              }
            }
          }
        } catch (error) {
          console.error(`Failed to analyze ${file.to}:`, error.message);
        }
      }

      if (filesAnalyzed === 0) {
        await prisma.codeReview.update({
          where: { id: review.id },
          data: { status: "FAILED" },
        });
        throw new Error("No supported files found in commit to analyze");
      }

      const criticalIssues = allIssues.filter(
        (i) => i.severity === "CRITICAL"
      ).length;
      const majorIssues = allIssues.filter(
        (i) => i.severity === "MAJOR"
      ).length;
      const minorIssues = allIssues.filter(
        (i) => i.severity === "MINOR"
      ).length;

      let estimatedEffort = 0;
      if (allIssues.length > 0) {
        try {
          const effortEstimate = await aiService.estimateEffort(allIssues);
          estimatedEffort = effortEstimate.totalEffort || 0;

          if (
            effortEstimate.breakdown &&
            Array.isArray(effortEstimate.breakdown)
          ) {
            for (const item of effortEstimate.breakdown) {
              const issue = allIssues.find((i) => i.title === item.issue);
              if (issue && item.effort) {
                await prisma.codeIssue.update({
                  where: { id: issue.id },
                  data: { effort: item.effort },
                });
              }
            }
          }
        } catch (error) {
          console.error("Failed to estimate effort:", error.message);
          estimatedEffort = allIssues.length * 0.5;
        }
      }

      const analysisTime = (Date.now() - startTime) / 1000;
      const updatedReview = await prisma.codeReview.update({
        where: { id: review.id },
        data: {
          status: "COMPLETED",
          filesAnalyzed: filesAnalyzed,
          issuesFound: allIssues.length,
          criticalIssues,
          majorIssues,
          minorIssues,
          estimatedEffort,
          tokensUsed: totalTokens,
          analysisTime,
          recommendations: allRecommendations,
        },
        include: {
          issues: true,
        },
      });

      return updatedReview;
    } catch (error) {
      console.error("Commit analysis failed:", error);
      throw error;
    }
  }

  /**
   * Generate automatic fix for an issue
   */
  async generateAutoFix(issueId, repositoryPath) {
    try {
      const issue = await prisma.codeIssue.findUnique({
        where: { id: issueId },
      });

      if (!issue) {
        throw new Error("Issue not found");
      }

      if (!issue.autoFixable) {
        throw new Error("This issue is not auto-fixable");
      }

      const fileExt = path.extname(issue.filePath);
      const language = this.supportedExtensions[fileExt];

      if (!language) {
        throw new Error("Unsupported file type");
      }

      // Get the original code
      const fullPath = path.join(repositoryPath, issue.filePath);
      const fileContent = await fs.readFile(fullPath, "utf-8");
      const lines = fileContent.split("\n");

      // Extract relevant code section
      const startLine = Math.max(0, issue.lineNumber - 5);
      const endLine = Math.min(
        lines.length,
        (issue.lineEnd || issue.lineNumber) + 5
      );
      const codeSection = lines.slice(startLine, endLine).join("\n");

      // Generate fix
      const fixedCode = await aiService.generateFix(
        codeSection,
        issue,
        language
      );

      // Update issue with fix
      await prisma.codeIssue.update({
        where: { id: issueId },
        data: { fixCode: fixedCode },
      });

      return { fixedCode, originalCode: codeSection };
    } catch (error) {
      console.error("Auto-fix generation failed:", error);
      throw error;
    }
  }

  /**
   * Extract changed code from diff
   */
  extractChangedCode(file) {
    const changedLines = [];
    let lineNumber = 1;

    for (const chunk of file.chunks) {
      // Track line numbers
      lineNumber = chunk.newStart || 1;

      for (const change of chunk.changes) {
        // Include added lines and context lines for better analysis
        if (change.type === "add") {
          changedLines.push({
            line: lineNumber,
            content: change.content.substring(1), // Remove the '+' prefix
            type: "add",
          });
          lineNumber++;
        } else if (change.type === "normal") {
          // Include context for better understanding
          changedLines.push({
            line: lineNumber,
            content: change.content.substring(1), // Remove the ' ' prefix
            type: "context",
          });
          lineNumber++;
        } else if (change.type === "del") {
          // Don't increment line number for deletions
          continue;
        }
      }
    }

    // Return the code with line number information
    return changedLines.map((l) => l.content).join("\n");
  }

  /**
   * Get active coding standards
   */
  async getActiveStandards() {
    return await prisma.codingStandard.findMany({
      where: { isActive: true },
    });
  }

  /**
   * Get review statistics
   */
  async getReviewStats(userId) {
    const reviews = await prisma.codeReview.findMany({
      where: { userId },
      include: {
        issues: true,
      },
    });

    const totalReviews = reviews.length;
    const totalIssues = reviews.reduce((sum, r) => sum + r.issuesFound, 0);
    const totalCritical = reviews.reduce((sum, r) => sum + r.criticalIssues, 0);
    const totalMajor = reviews.reduce((sum, r) => sum + r.majorIssues, 0);
    const totalMinor = reviews.reduce((sum, r) => sum + r.minorIssues, 0);
    const totalTokens = reviews.reduce((sum, r) => sum + r.tokensUsed, 0);
    const avgAnalysisTime =
      reviews.reduce((sum, r) => sum + (r.analysisTime || 0), 0) / totalReviews;

    return {
      totalReviews,
      totalIssues,
      totalCritical,
      totalMajor,
      totalMinor,
      totalTokens,
      avgAnalysisTime: avgAnalysisTime.toFixed(2),
    };
  }
}

export default new CodeAnalysisService();
