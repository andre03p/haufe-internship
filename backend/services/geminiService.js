import { GoogleGenerativeAI } from "@google/generative-ai";

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = process.env.GEMINI_MODEL || "gemini-2.0-flash-lite	";
    this.genAI = null;
    this.generativeModel = null;

    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.generativeModel = this.genAI.getGenerativeModel({
        model: this.model,
      });
    }
  }

  /**
   * Check if Gemini API is configured and working
   */
  async checkHealth() {
    if (!this.apiKey) {
      return {
        status: "error",
        message: "Gemini API key not configured",
        error: "Missing GEMINI_API_KEY in environment variables",
      };
    }

    if (!this.generativeModel) {
      return {
        status: "error",
        message: "Gemini model not initialized",
      };
    }

    try {
      // Simple test to verify API is working
      const result = await this.generativeModel.generateContent("Hello");
      const response = await result.response;
      const text = response.text();

      if (text) {
        return {
          status: "ok",
          message: "Gemini API is ready",
          model: this.model,
        };
      }

      return {
        status: "warning",
        message: "Gemini API responded but no content",
      };
    } catch (error) {
      console.error("Gemini health check failed:", error.message);
      return {
        status: "error",
        message: "Gemini API is not accessible",
        error: error.message,
      };
    }
  }

  /**
   * Analyze code and detect issues
   */
  async analyzeCode(code, filePath, language, standards = []) {
    if (!this.generativeModel) {
      throw new Error("Gemini API not configured. Please set GEMINI_API_KEY.");
    }

    const prompt = this.buildAnalysisPrompt(
      code,
      filePath,
      language,
      standards
    );

    try {
      const result = await this.generativeModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Estimate token usage (Gemini doesn't provide exact counts in the same way)
      const estimatedTokens = Math.ceil((prompt.length + text.length) / 4);

      return {
        analysis: this.parseAnalysisResponse(text),
        tokensUsed: estimatedTokens,
        rawResponse: text,
      };
    } catch (error) {
      console.error("Gemini code analysis failed:", error);
      throw new Error(`Gemini analysis failed: ${error.message}`);
    }
  }

  /**
   * Generate automatic fix for an issue
   */
  async generateFix(code, issue, language) {
    if (!this.generativeModel) {
      throw new Error("Gemini API not configured");
    }

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
      const result = await this.generativeModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.extractFixedCode(text);
    } catch (error) {
      console.error("Gemini fix generation failed:", error);
      throw new Error(`Fix generation failed: ${error.message}`);
    }
  }

  /**
   * Estimate development effort for fixes
   */
  async estimateEffort(issues) {
    if (!this.generativeModel) {
      throw new Error("Gemini API not configured");
    }

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
      const result = await this.generativeModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseJsonResponse(text);
    } catch (error) {
      console.error("Gemini effort estimation failed:", error);
      // Return default estimates if API fails
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
        "Could not parse Gemini response as JSON. Response:",
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
   * Extract fixed code from response
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
   * Parse JSON response
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

export default new GeminiService();
