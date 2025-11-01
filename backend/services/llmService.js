import { Ollama } from "ollama";

class LLMService {
  constructor() {
    this.ollama = new Ollama({
      host: process.env.OLLAMA_HOST || "http://127.0.0.1:11434",
    });
    this.model = process.env.OLLAMA_MODEL || "llama3.2:latest";
    this.maxTokens = parseInt(process.env.MAX_TOKENS || "4096");
  }

  /**
   * Check if Ollama is running and model is available
   */
  async checkHealth() {
    try {
      const models = await this.ollama.list();
      const modelExists = models.models.some((m) => m.name === this.model);

      if (!modelExists) {
        console.warn(
          `Model ${this.model} not found. Available models:`,
          models.models.map((m) => m.name).join(", ")
        );
        return {
          status: "warning",
          message: `Model ${this.model} not available`,
          availableModels: models.models.map((m) => m.name),
        };
      }

      return {
        status: "ok",
        message: "LLM service is ready",
        model: this.model,
      };
    } catch (error) {
      console.error("Ollama health check failed:", error.message);
      return {
        status: "error",
        message: "Ollama is not running or not accessible",
        error: error.message,
      };
    }
  }

  /**
   * Analyze code and detect issues
   */
  async analyzeCode(code, filePath, language, standards = []) {
    const prompt = this.buildAnalysisPrompt(
      code,
      filePath,
      language,
      standards
    );

    try {
      let response = "";
      let tokensUsed = 0;
      let promptTokens = 0;

      const stream = await this.ollama.generate({
        model: this.model,
        prompt,
        stream: true,
        options: {
          temperature: 0.3, // Lower temperature for more consistent analysis
          num_predict: this.maxTokens,
        },
      });

      for await (const chunk of stream) {
        response += chunk.response;
        if (chunk.eval_count) {
          tokensUsed = chunk.eval_count;
        }
        if (chunk.prompt_eval_count) {
          promptTokens = chunk.prompt_eval_count;
        }
      }

      const totalTokens = tokensUsed + promptTokens;

      return {
        analysis: this.parseAnalysisResponse(response),
        tokensUsed: totalTokens || Math.ceil(prompt.length / 4), // Estimate if not provided
        rawResponse: response,
      };
    } catch (error) {
      console.error("Code analysis failed:", error);
      throw new Error(`LLM analysis failed: ${error.message}`);
    }
  }

  /**
   * Generate automatic fix for an issue
   */
  async generateFix(code, issue, language) {
    const prompt = `You are an expert code reviewer. Generate a fixed version of the following code to address this issue:

Issue: ${issue.title}
Description: ${issue.description}
Language: ${language}
File: ${issue.filePath}
Line: ${issue.lineNumber}

Original Code:
\`\`\`${language}
${code}
\`\`\`

Provide ONLY the fixed code without explanations. Format your response as:
FIXED_CODE:
\`\`\`${language}
<your fixed code here>
\`\`\``;

    try {
      let response = "";
      const stream = await this.ollama.generate({
        model: this.model,
        prompt,
        stream: true,
        options: {
          temperature: 0.2,
          num_predict: 2048,
        },
      });

      for await (const chunk of stream) {
        response += chunk.response;
      }

      return this.extractFixedCode(response);
    } catch (error) {
      console.error("Fix generation failed:", error);
      throw new Error(`Fix generation failed: ${error.message}`);
    }
  }

  /**
   * Estimate development effort for fixes
   */
  async estimateEffort(issues) {
    const issuesSummary = issues
      .map((i) => `- ${i.severity}: ${i.title} in ${i.filePath}`)
      .join("\n");

    const prompt = `You are a technical project manager. Estimate the development effort (in hours) needed to fix these code issues:

${issuesSummary}

For each issue, provide an effort estimate. Consider:
- Issue complexity
- File changes required
- Testing needs
- Documentation updates

Respond in this JSON format:
{
  "totalEffort": <number in hours>,
  "breakdown": [
    {"issue": "<issue title>", "effort": <hours>, "reasoning": "<brief explanation>"}
  ]
}`;

    try {
      let response = "";
      const stream = await this.ollama.generate({
        model: this.model,
        prompt,
        stream: true,
        options: {
          temperature: 0.3,
          num_predict: 2048,
        },
      });

      for await (const chunk of stream) {
        response += chunk.response;
      }

      return this.parseJsonResponse(response);
    } catch (error) {
      console.error("Effort estimation failed:", error);
      // Return default estimates if LLM fails
      return {
        totalEffort: issues.length * 0.5,
        breakdown: issues.map((i) => ({
          issue: i.title,
          effort: 0.5,
          reasoning: "Default estimate",
        })),
      };
    }
  }

  /**
   * Build comprehensive analysis prompt
   */
  buildAnalysisPrompt(code, filePath, language, standards) {
    const standardsText =
      standards.length > 0
        ? `\n\nCoding Standards to check:\n${standards
            .map((s) => `- ${s.name}: ${s.description || ""}`)
            .join("\n")}`
        : "";

    return `You are an expert code reviewer specialized in ${language}. Perform a comprehensive multi-dimensional analysis of the following code.${standardsText}

File: ${filePath}
Language: ${language}

Code:
\`\`\`${language}
${code}
\`\`\`

Provide a detailed analysis in the following JSON format:
{
  "issues": [
    {
      "line": <line number>,
      "lineEnd": <end line number if multi-line>,
      "severity": "CRITICAL" | "MAJOR" | "MINOR" | "INFO",
      "category": "bug" | "security" | "performance" | "style" | "maintainability" | "testing" | "architecture" | "documentation" | "ci-cd",
      "title": "<short issue title>",
      "description": "<detailed explanation>",
      "suggestion": "<how to fix it>",
      "autoFixable": true | false,
      "standard": "<applicable standard name if any>",
      "documentationNeeded": "<documentation changes needed, if any>"
    }
  ],
  "summary": {
    "critical": <count>,
    "major": <count>,
    "minor": <count>,
    "info": <count>
  },
  "recommendations": {
    "documentation": ["<documentation recommendations>"],
    "testing": ["<testing recommendations>"],
    "architecture": ["<architecture recommendations>"],
    "cicd": ["<CI/CD recommendations>"]
  }
}

Analyze across multiple dimensions:
1. **Security**: SQL injection, XSS, authentication flaws, data exposure, insecure dependencies
2. **Bugs & Logic**: Error handling, edge cases, null checks, logic errors, race conditions
3. **Performance**: Algorithm efficiency, memory leaks, database queries, caching opportunities
4. **Code Quality**: Style violations, code smells, complexity, readability, maintainability
5. **Testing**: Missing tests, test coverage, test quality, testability
6. **Architecture**: Design patterns, separation of concerns, coupling, scalability
7. **Documentation**: Missing docstrings, unclear comments, outdated documentation
8. **CI/CD**: Build issues, deployment concerns, environment configuration

Be specific, actionable, and provide clear explanations with line numbers.`;
  }

  /**
   * Parse LLM response to extract issues
   */
  parseAnalysisResponse(response) {
    try {
      // Try to extract JSON from markdown code blocks or raw text
      let jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);

      if (!jsonMatch) {
        // Try without code blocks
        jsonMatch = response.match(/\{[\s\S]*\}/);
      }

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);

        // Validate and normalize the structure
        const issues = Array.isArray(parsed.issues) ? parsed.issues : [];

        // Ensure each issue has required fields
        const validIssues = issues
          .filter(
            (issue) =>
              issue.title &&
              issue.description &&
              issue.severity &&
              issue.category &&
              issue.line !== undefined
          )
          .map((issue) => ({
            line: issue.line || 1,
            lineEnd: issue.lineEnd || issue.line || 1,
            severity: issue.severity || "INFO",
            category: issue.category || "style",
            title: issue.title,
            description: issue.description,
            suggestion: issue.suggestion || "",
            autoFixable: Boolean(issue.autoFixable),
            standard: issue.standard || null,
            documentationNeeded: issue.documentationNeeded || null,
          }));

        return {
          issues: validIssues,
          summary: parsed.summary || {
            critical: validIssues.filter((i) => i.severity === "CRITICAL")
              .length,
            major: validIssues.filter((i) => i.severity === "MAJOR").length,
            minor: validIssues.filter((i) => i.severity === "MINOR").length,
            info: validIssues.filter((i) => i.severity === "INFO").length,
          },
          recommendations: {
            documentation: Array.isArray(parsed.recommendations?.documentation)
              ? parsed.recommendations.documentation
              : [],
            testing: Array.isArray(parsed.recommendations?.testing)
              ? parsed.recommendations.testing
              : [],
            architecture: Array.isArray(parsed.recommendations?.architecture)
              ? parsed.recommendations.architecture
              : [],
            cicd: Array.isArray(parsed.recommendations?.cicd)
              ? parsed.recommendations.cicd
              : [],
          },
        };
      }

      // If no JSON found, return empty result
      console.warn(
        "Could not parse LLM response as JSON. Response:",
        response.substring(0, 200)
      );
      return {
        issues: [],
        summary: { critical: 0, major: 0, minor: 0, info: 0 },
        recommendations: {
          documentation: [],
          testing: [],
          architecture: [],
          cicd: [],
        },
      };
    } catch (error) {
      console.error("Failed to parse analysis response:", error.message);
      console.error("Response excerpt:", response.substring(0, 500));
      return {
        issues: [],
        summary: { critical: 0, major: 0, minor: 0, info: 0 },
        recommendations: {
          documentation: [],
          testing: [],
          architecture: [],
          cicd: [],
        },
      };
    }
  }

  /**
   * Extract fixed code from LLM response
   */
  extractFixedCode(response) {
    const codeMatch =
      response.match(/FIXED_CODE:\s*```[\w]*\s*([\s\S]*?)```/) ||
      response.match(/```[\w]*\s*([\s\S]*?)```/);

    if (codeMatch) {
      return codeMatch[1].trim();
    }

    return response.trim();
  }

  /**
   * Parse JSON response from LLM
   */
  parseJsonResponse(response) {
    try {
      const jsonMatch =
        response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
        response.match(/(\{[\s\S]*\})/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      return JSON.parse(response);
    } catch (error) {
      console.error("Failed to parse JSON response:", error);
      throw error;
    }
  }
}

export default new LLMService();
