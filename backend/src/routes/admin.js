const crypto = require("crypto");
const express = require("express");
const router = express.Router();
const prisma = require("../db");

function secretsMatch(receivedSecret, expectedSecret) {
  if (!receivedSecret || !expectedSecret) return false;

  const received = Buffer.from(receivedSecret);
  const expected = Buffer.from(expectedSecret);

  return (
    received.length === expected.length &&
    crypto.timingSafeEqual(received, expected)
  );
}

function requireAdmin(req, res, next) {
  const expectedSecret = process.env.ADMIN_SECRET;

  if (!expectedSecret) {
    return res.status(503).json({ error: "admin access is not configured" });
  }

  const receivedSecret = req.get("x-admin-secret");

  if (!secretsMatch(receivedSecret, expectedSecret)) {
    return res.status(401).json({ error: "invalid admin secret" });
  }

  next();
}

router.use(requireAdmin);

router.get("/teams", async (_req, res) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: {
          orderBy: { createdAt: "asc" },
        },
        levelProgress: {
          include: { level: true },
          orderBy: { levelId: "asc" },
        },
        _count: {
          select: { attempts: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(teams);
  } catch (error) {
    console.error("Error fetching admin teams:", error);
    res.status(500).json({ error: "failed to fetch teams" });
  }
});

router.get("/teams/:id", async (req, res) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          orderBy: { createdAt: "asc" },
        },
        levelProgress: {
          include: { level: true },
          orderBy: { levelId: "asc" },
        },
        attempts: {
          include: { level: true },
          orderBy: [{ endedAt: "desc" }, { startedAt: "desc" }],
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: "team not found" });
    }

    res.json(team);
  } catch (error) {
    console.error("Error fetching admin team detail:", error);
    res.status(500).json({ error: "failed to fetch team detail" });
  }
});

router.delete("/teams/:id", async (req, res) => {
  try {
    const team = await prisma.team.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          orderBy: { createdAt: "asc" },
        },
        _count: {
          select: {
            attempts: true,
            levelProgress: true,
          },
        },
      },
    });

    if (!team) {
      return res.status(404).json({ error: "team not found" });
    }

    await prisma.team.delete({
      where: { id: req.params.id },
    });

    res.json({
      message: "team deleted",
      deletedTeam: {
        id: team.id,
        course: team.course,
        members: team.members.map((member) => member.name),
        attemptsDeleted: team._count.attempts,
        progressRowsDeleted: team._count.levelProgress,
      },
    });
  } catch (error) {
    console.error("Error deleting admin team:", error);
    res.status(500).json({ error: "failed to delete team" });
  }
});

module.exports = router;
