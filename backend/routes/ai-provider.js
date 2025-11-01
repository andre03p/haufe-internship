import express from "express";
import aiService from "../services/aiService.js";
import llmService from "../services/llmService.js";
import geminiService from "../services/geminiService.js";

const router = express.Router();

/**
 * GET /api/ai/provider
 * Get current AI provider
 */
router.get("/provider", (req, res) => {
  try {
    const currentProvider = aiService.getProvider();
    res.json({
      success: true,
      provider: currentProvider,
      available: ["ollama", "gemini"],
    });
  } catch (error) {
    console.error("Get provider error:", error);
    res.status(500).json({ error: "Failed to get provider" });
  }
});

/**
 * POST /api/ai/provider
 * Set AI provider
 */
router.post("/provider", async (req, res) => {
  try {
    const { provider } = req.body;

    if (!provider) {
      return res.status(400).json({ error: "Provider is required" });
    }

    if (provider !== "ollama" && provider !== "gemini") {
      return res.status(400).json({
        error: 'Invalid provider. Must be "ollama" or "gemini"',
      });
    }

    // Set the provider
    aiService.setProvider(provider);

    // Check if the new provider is healthy
    const health = await aiService.checkHealth();

    res.json({
      success: true,
      provider: provider,
      health: health,
      message: `AI provider switched to ${provider}`,
    });
  } catch (error) {
    console.error("Set provider error:", error);
    res.status(500).json({
      error: error.message || "Failed to set provider",
    });
  }
});

/**
 * GET /api/ai/health/all
 * Check health of all AI providers
 */
router.get("/health/all", async (req, res) => {
  try {
    const ollamaHealth = await llmService.checkHealth();
    const geminiHealth = await geminiService.checkHealth();
    const currentProvider = aiService.getProvider();

    res.json({
      success: true,
      currentProvider: currentProvider,
      providers: {
        ollama: ollamaHealth,
        gemini: geminiHealth,
      },
    });
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      error: "Failed to check provider health",
    });
  }
});

export default router;
