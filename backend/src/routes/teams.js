const express = require("express");
const router = express.Router();
const prisma = require("../db");

// POST /api/teams — Register a new team
router.post("/", async (req, res) => {
  try {
    const { members, course } = req.body;

    // Basic validation
    if (!course || typeof course !== "string") {
      return res.status(400).json({ error: "course is required" });
    }
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: "at least one member is required" });
    }
    for (const name of members) {
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "each member must have a non-empty name" });
      }
    }

    // Create team with members in a single transaction
    const team = await prisma.team.create({
      data: {
        course: course.trim(),
        members: {
          create: members.map((name) => ({ name: name.trim() })),
        },
        levelProgress: {
          create: [
            { levelId: 1, unlocked: true, completed: false },
            { levelId: 2, unlocked: false, completed: false },
          ],
        },
      },
      include: {
        members: true,
        levelProgress: { include: { level: true } },
      },
    });

    res.status(201).json(team);
  } catch (error) {
    console.error("Error creating team:", error);
    res.status(500).json({ error: "failed to create team" });
  }
});

// GET /api/teams/:id — Get a team by ID
router.get("/:id", async (req, res) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        members: true,
        levelProgress: {
          include: { level: true },
          orderBy: { levelId: "asc" },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: "team not found" });
    }

    res.json(team);
  } catch (error) {
    console.error("Error fetching team:", error);
    res.status(500).json({ error: "failed to fetch team" });
  }
});

module.exports = router;