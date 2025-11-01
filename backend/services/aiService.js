import llmService from "./llmService.js";
import geminiService from "./geminiService.js";

class AIService {
  constructor() {
    // Default to the configured AI provider
    this.provider = process.env.AI_PROVIDER || "ollama"; // 'ollama' or 'gemini'
    console.log(`AI Service initialized with provider: ${this.provider}`);
  }

  /**
   * Get the active AI service based on configuration
   */
  getService() {
    if (this.provider === "gemini") {
      return geminiService;
    }
    return llmService;
  }

  /**
   * Check health of the active AI service
   */
  async checkHealth() {
    const service = this.getService();
    const health = await service.checkHealth();
    return {
      ...health,
      provider: this.provider,
    };
  }

  /**
   * Check health of all AI services
   */
  async checkAllHealth() {
    const ollamaHealth = await llmService.checkHealth();
    const geminiHealth = await geminiService.checkHealth();
    return {
      currentProvider: this.provider,
      ollama: ollamaHealth,
      gemini: geminiHealth,
    };
  }

  /**
   * Analyze code using the active AI service
   */
  async analyzeCode(code, filePath, language, standards = []) {
    const service = this.getService();

    // Verify the service is available
    const health = await service.checkHealth();
    if (health.status === "error") {
      throw new Error(
        `${this.provider} is not available: ${health.error || health.message}`
      );
    }

    return await service.analyzeCode(code, filePath, language, standards);
  }

  /**
   * Generate fix using the active AI service
   */
  async generateFix(code, issue, language) {
    const service = this.getService();

    // Verify the service is available
    const health = await service.checkHealth();
    if (health.status === "error") {
      throw new Error(
        `${this.provider} is not available: ${health.error || health.message}`
      );
    }

    return await service.generateFix(code, issue, language);
  }

  /**
   * Estimate effort using the active AI service
   */
  async estimateEffort(issues) {
    const service = this.getService();

    // Verify the service is available
    const health = await service.checkHealth();
    if (health.status === "error") {
      throw new Error(
        `${this.provider} is not available: ${health.error || health.message}`
      );
    }

    return await service.estimateEffort(issues);
  }

  /**
   * Switch AI provider dynamically
   */
  setProvider(provider) {
    if (provider !== "ollama" && provider !== "gemini") {
      throw new Error('Invalid provider. Must be "ollama" or "gemini"');
    }
    this.provider = provider;
    console.log(`AI provider switched to: ${provider}`);
  }

  /**
   * Get current provider
   */
  getProvider() {
    return this.provider;
  }
}

export default new AIService();
