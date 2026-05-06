const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const express = require("express");
const cors = require("cors");

const healthRouter = require("./routes/health");
const teamsRouter = require("./routes/teams");
const progressRouter = require("./routes/progress");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

// Routes
app.use("/api/health", healthRouter);
app.use("/api/teams", teamsRouter);
app.use("/api/progress", progressRouter);

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});