const express = require("express");
const router = express.Router();
const prisma = require("../db");
const { validateTeamRegistration } = require("../validation/teamRegistration");

// POST /api/teams — Register a new team
router.post("/", async (req, res) => {
  try {
    const validated = validateTeamRegistration(req.body);
    if (validated.error) {
      return res.status(400).json({ error: validated.error });
    }
    const { members, course } = validated;

    // Create team with members in a single transaction
    const team = await prisma.team.create({
      data: {
        course,
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
