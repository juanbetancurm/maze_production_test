const express = require("express");
const router = express.Router();
const prisma = require("../db");

router.get("/", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});

module.exports = router;