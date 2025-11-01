import express from "express";
import { prisma } from "../server.js";

const router = express.Router();

/**
 * GET /api/standards
 * Get all coding standards
 */
router.get("/", async (req, res) => {
  try {
    const { language, isActive } = req.query;

    const where = {};
    if (language) where.language = language;
    if (isActive !== undefined) where.isActive = isActive === "true";

    const standards = await prisma.codingStandard.findMany({
      where,
      orderBy: [{ isBuiltIn: "desc" }, { name: "asc" }],
    });

    res.json({ success: true, standards });
  } catch (error) {
    console.error("Get standards error:", error);
    res.status(500).json({ error: "Failed to fetch standards" });
  }
});

/**
 * GET /api/standards/:id
 * Get specific standard
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const standard = await prisma.codingStandard.findUnique({
      where: { id },
    });

    if (!standard) {
      return res.status(404).json({ error: "Standard not found" });
    }

    res.json({ success: true, standard });
  } catch (error) {
    console.error("Get standard error:", error);
    res.status(500).json({ error: "Failed to fetch standard" });
  }
});

/**
 * POST /api/standards
 * Create new coding standard
 */
router.post("/", async (req, res) => {
  try {
    const { name, description, language, rules, isActive = true } = req.body;

    if (!name || !language || !rules) {
      return res.status(400).json({
        error: "name, language, and rules are required",
      });
    }

    const standard = await prisma.codingStandard.create({
      data: {
        name,
        description,
        language,
        rules,
        isActive,
        isBuiltIn: false,
      },
    });

    res.json({ success: true, standard });
  } catch (error) {
    console.error("Create standard error:", error);
    res.status(500).json({ error: "Failed to create standard" });
  }
});

/**
 * PUT /api/standards/:id
 * Update coding standard
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, language, rules, isActive } = req.body;

    const existing = await prisma.codingStandard.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Standard not found" });
    }

    if (existing.isBuiltIn) {
      return res.status(403).json({
        error: "Cannot modify built-in standards",
      });
    }

    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (language !== undefined) data.language = language;
    if (rules !== undefined) data.rules = rules;
    if (isActive !== undefined) data.isActive = isActive;

    const standard = await prisma.codingStandard.update({
      where: { id },
      data,
    });

    res.json({ success: true, standard });
  } catch (error) {
    console.error("Update standard error:", error);
    res.status(500).json({ error: "Failed to update standard" });
  }
});

/**
 * DELETE /api/standards/:id
 * Delete coding standard
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.codingStandard.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Standard not found" });
    }

    if (existing.isBuiltIn) {
      return res.status(403).json({
        error: "Cannot delete built-in standards",
      });
    }

    await prisma.codingStandard.delete({
      where: { id },
    });

    res.json({ success: true, message: "Standard deleted successfully" });
  } catch (error) {
    console.error("Delete standard error:", error);
    res.status(500).json({ error: "Failed to delete standard" });
  }
});

/**
 * POST /api/standards/seed
 * Seed built-in coding standards
 */
router.post("/seed", async (req, res) => {
  try {
    const builtInStandards = [
      {
        name: "PEP8",
        description:
          "Python Enhancement Proposal 8 - Style Guide for Python Code",
        language: "python",
        isBuiltIn: true,
        isActive: true,
        rules: {
          maxLineLength: 79,
          indentation: 4,
          namingConventions: {
            functions: "snake_case",
            classes: "PascalCase",
            constants: "UPPER_CASE",
          },
          imports:
            "one per line, grouped by standard library, third-party, local",
        },
      },
      {
        name: "Google JavaScript Style Guide",
        description: "Google's JavaScript style guide",
        language: "javascript",
        isBuiltIn: true,
        isActive: true,
        rules: {
          indentation: 2,
          quotes: "single",
          semicolons: "required",
          namingConventions: {
            functions: "camelCase",
            classes: "PascalCase",
            constants: "UPPER_CASE",
          },
        },
      },
      {
        name: "Airbnb JavaScript Style Guide",
        description: "Airbnb's JavaScript style guide",
        language: "javascript",
        isBuiltIn: true,
        isActive: false,
        rules: {
          indentation: 2,
          quotes: "single",
          semicolons: "required",
          arrowFunctions: "prefer",
          destructuring: "use when possible",
        },
      },
      {
        name: "Oracle Java Code Conventions",
        description: "Oracle's Java coding conventions",
        language: "java",
        isBuiltIn: true,
        isActive: true,
        rules: {
          indentation: 4,
          braceStyle: "K&R",
          namingConventions: {
            methods: "camelCase",
            classes: "PascalCase",
            constants: "UPPER_CASE",
            packages: "lowercase",
          },
        },
      },
    ];

    const created = [];
    for (const standard of builtInStandards) {
      const existing = await prisma.codingStandard.findUnique({
        where: { name: standard.name },
      });

      if (!existing) {
        const created_standard = await prisma.codingStandard.create({
          data: standard,
        });
        created.push(created_standard);
      }
    }

    res.json({
      success: true,
      message: `Seeded ${created.length} built-in standards`,
      standards: created,
    });
  } catch (error) {
    console.error("Seed standards error:", error);
    res.status(500).json({ error: "Failed to seed standards" });
  }
});

export default router;
