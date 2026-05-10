const express = require("express");
const router = express.Router();
const prisma = require("../db");

// POST /api/progress/complete-level — Mark a level as completed
router.post("/complete-level", async (req, res) => {
  try {
    const { teamId, level, moves, livesRemaining, elapsedSeconds } = req.body;

    // Basic validation
    if (!teamId || typeof level !== "number") {
      return res.status(400).json({ error: "teamId and level are required" });
    }

    // Update the completed level's progress
    const updatedProgress = await prisma.levelProgress.update({
      where: {
        teamId_levelId: { teamId, levelId: level },
      },
      data: {
        unlocked: false,
        completed: true,
        completedAt: new Date(),
        bestMoves:
          moves !== undefined
            ? { set: moves }
            : undefined,
        bestTimeSeconds:
          elapsedSeconds !== undefined
            ? { set: elapsedSeconds }
            : undefined,
        bestLivesRemaining:
          livesRemaining !== undefined
            ? { set: livesRemaining }
            : undefined,
      },
    });

    // Unlock the next level if it exists
    const nextLevelId = level + 1;
    const nextLevel = await prisma.level.findUnique({
      where: { id: nextLevelId },
    });

    if (nextLevel) {
      await prisma.levelProgress.update({
        where: {
          teamId_levelId: { teamId, levelId: nextLevelId },
        },
        data: { unlocked: true },
      });
    }

    // Create a completed attempt record
    await prisma.attempt.create({
      data: {
        teamId,
        levelId: level,
        movesCount: moves || 0,
        durationSeconds: elapsedSeconds ?? undefined,
        livesRemaining: livesRemaining || 0,
        status: "completed",
        endedAt: new Date(),
      },
    });

    // Return full progress for the team
    const allProgress = await prisma.levelProgress.findMany({
      where: { teamId },
      include: { level: true },
      orderBy: { levelId: "asc" },
    });

    res.json({ message: "level completed", progress: allProgress });
  } catch (error) {
    console.error("Error completing level:", error);
    res.status(500).json({ error: "failed to complete level" });
  }
});

// GET /api/progress/:teamId — Get all progress for a team
router.get("/:teamId", async (req, res) => {
  try {
    const progress = await prisma.levelProgress.findMany({
      where: { teamId: req.params.teamId },
      include: { level: true },
      orderBy: { levelId: "asc" },
    });

    if (progress.length === 0) {
      return res.status(404).json({ error: "no progress found for this team" });
    }

    res.json(progress);
  } catch (error) {
    console.error("Error fetching progress:", error);
    res.status(500).json({ error: "failed to fetch progress" });
  }
});

// GET /api/progress/leaderboard/:levelId — Get top completed teams for a level
router.get("/leaderboard/:levelId", async (req, res) => {
  try {
    const levelId = Number.parseInt(req.params.levelId, 10);

    if (!Number.isInteger(levelId) || levelId <= 0) {
      return res.status(400).json({ error: "levelId must be a positive integer" });
    }

    const leaderboard = await prisma.levelProgress.findMany({
      where: {
        levelId,
        completed: true,
      },
      include: {
        team: {
          include: {
            members: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
        level: true,
      },
      orderBy: [
        { bestMoves: "asc" },
        { bestTimeSeconds: "asc" },
        { bestLivesRemaining: "desc" },
        { completedAt: "asc" },
      ],
      take: 10,
    });

    res.json({
      levelId,
      levelName: leaderboard[0]?.level?.name || null,
      winners: leaderboard.map((entry, index) => ({
        rank: index + 1,
        teamId: entry.teamId,
        course: entry.team.course,
        members: entry.team.members.map((member) => member.name),
        bestMoves: entry.bestMoves,
        bestTimeSeconds: entry.bestTimeSeconds,
        bestLivesRemaining: entry.bestLivesRemaining,
        completedAt: entry.completedAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ error: "failed to fetch leaderboard" });
  }
});

module.exports = router;
