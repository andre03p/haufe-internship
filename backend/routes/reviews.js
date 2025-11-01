import express from "express";
import codeAnalysisService from "../services/codeAnalysisService.js";
import aiService from "../services/aiService.js";
import { prisma } from "../server.js";

const router = express.Router();

/**
 * POST /api/reviews/analyze-staged
 * Analyze staged changes in repository
 */
router.post("/analyze-staged", async (req, res) => {
  try {
    const { repositoryPath, userId, provider } = req.body;

    if (!repositoryPath || !userId) {
      return res.status(400).json({
        error: "repositoryPath and userId are required",
      });
    }

    // Switch provider if specified
    const currentProvider = aiService.getProvider();
    if (provider && provider !== currentProvider) {
      if (provider !== "ollama" && provider !== "gemini") {
        return res.status(400).json({
          error: 'Invalid provider. Must be "ollama" or "gemini"',
        });
      }
      aiService.setProvider(provider);
    }

    const review = await codeAnalysisService.analyzeStagedChanges(
      repositoryPath,
      userId
    );

    res.json({
      success: true,
      review,
      provider: aiService.getProvider(),
      message: `Analysis complete. Found ${review.issuesFound} issues.`,
    });
  } catch (error) {
    console.error("Staged analysis error:", error);
    res.status(500).json({
      error: error.message || "Failed to analyze staged changes",
    });
  }
});

/**
 * POST /api/reviews/analyze-commit
 * Analyze specific commit
 */
router.post("/analyze-commit", async (req, res) => {
  try {
    const { repositoryPath, commitHash, userId, provider } = req.body;

    if (!repositoryPath || !commitHash || !userId) {
      return res.status(400).json({
        error: "repositoryPath, commitHash, and userId are required",
      });
    }

    // Switch provider if specified
    const currentProvider = aiService.getProvider();
    if (provider && provider !== currentProvider) {
      if (provider !== "ollama" && provider !== "gemini") {
        return res.status(400).json({
          error: 'Invalid provider. Must be "ollama" or "gemini"',
        });
      }
      aiService.setProvider(provider);
    }

    const review = await codeAnalysisService.analyzeCommit(
      repositoryPath,
      commitHash,
      userId
    );

    res.json({
      success: true,
      review,
      provider: aiService.getProvider(),
      message: `Analysis complete. Found ${review.issuesFound} issues.`,
    });
  } catch (error) {
    console.error("Commit analysis error:", error);
    res.status(500).json({
      error: error.message || "Failed to analyze commit",
    });
  }
});

/**
 * GET /api/reviews
 * Get all reviews for a user
 */
router.get("/", async (req, res) => {
  try {
    const { userId, limit = 20, offset = 0 } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const reviews = await prisma.codeReview.findMany({
      where: { userId: parseInt(userId) },
      include: {
        issues: true,
        _count: {
          select: { comments: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.codeReview.count({
      where: { userId: parseInt(userId) },
    });

    res.json({
      success: true,
      reviews,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

/**
 * GET /api/reviews/:id
 * Get specific review with all details
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const review = await prisma.codeReview.findUnique({
      where: { id },
      include: {
        issues: {
          orderBy: [{ severity: "asc" }, { lineNumber: "asc" }],
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    res.json({ success: true, review });
  } catch (error) {
    console.error("Get review error:", error);
    res.status(500).json({ error: "Failed to fetch review" });
  }
});

/**
 * POST /api/reviews/:id/comments
 * Add comment to review
 */
router.post("/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, content, issueId, type = "COMMENT" } = req.body;

    if (!userId || !content) {
      return res.status(400).json({
        error: "userId and content are required",
      });
    }

    const comment = await prisma.reviewComment.create({
      data: {
        reviewId: id,
        userId: parseInt(userId),
        content,
        issueId,
        type,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json({ success: true, comment });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

/**
 * PUT /api/reviews/issues/:issueId/resolve
 * Mark issue as resolved
 */
router.put("/issues/:issueId/resolve", async (req, res) => {
  try {
    const { issueId } = req.params;
    const { resolved = true } = req.body;

    const issue = await prisma.codeIssue.update({
      where: { id: issueId },
      data: { resolved },
    });

    res.json({ success: true, issue });
  } catch (error) {
    console.error("Resolve issue error:", error);
    res.status(500).json({ error: "Failed to update issue" });
  }
});

/**
 * POST /api/reviews/issues/:issueId/fix
 * Generate automatic fix for issue
 */
router.post("/issues/:issueId/fix", async (req, res) => {
  try {
    const { issueId } = req.params;
    const { repositoryPath } = req.body;

    if (!repositoryPath) {
      return res.status(400).json({ error: "repositoryPath is required" });
    }

    const fix = await codeAnalysisService.generateAutoFix(
      issueId,
      repositoryPath
    );

    res.json({ success: true, fix });
  } catch (error) {
    console.error("Generate fix error:", error);
    res.status(500).json({ error: error.message || "Failed to generate fix" });
  }
});

/**
 * GET /api/reviews/stats
 * Get review statistics for user
 */
router.get("/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const stats = await codeAnalysisService.getReviewStats(parseInt(userId));

    res.json({ success: true, stats });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

/**
 * DELETE /api/reviews/:id
 * Delete a review
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.codeReview.delete({
      where: { id },
    });

    res.json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ error: "Failed to delete review" });
  }
});

export default router;
