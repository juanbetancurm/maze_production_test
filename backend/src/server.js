const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
const express = require("express");
const cors = require("cors");

const healthRouter = require("./routes/health");
const teamsRouter = require("./routes/teams");
const progressRouter = require("./routes/progress");
const adminRouter = require("./routes/admin");

const app = express();
const PORT = process.env.PORT || 3001;
const configuredOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedDevOrigin(origin) {
  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
}

// Middleware
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (configuredOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    if (process.env.NODE_ENV !== "production" && isAllowedDevOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());

// Routes
app.use("/api/health", healthRouter);
app.use("/api/teams", teamsRouter);
app.use("/api/progress", progressRouter);
app.use("/api/admin", adminRouter);

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
