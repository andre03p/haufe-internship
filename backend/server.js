import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { prisma, connectDatabase, checkDatabaseHealth } from "./db.js";
import reviewsRouter from "./routes/reviews.js";
import standardsRouter from "./routes/standards.js";
import externalApiRouter from "./routes/external-api.js";
import aiProviderRouter from "./routes/ai-provider.js";
import aiService from "./services/aiService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Export prisma for use in routes
export { prisma };

// Connect to database
connectDatabase().catch((err) => {
  console.error("Failed to connect to database:", err);
  process.exit(1);
});

app.set("trust proxy", 1);

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(limiter);

// Health check
app.get("/health", async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const allAiHealth = await aiService.checkAllHealth();

  res.json({
    status: "ok",
    database: dbHealth,
    ai: allAiHealth,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/reviews", reviewsRouter);
app.use("/api/standards", standardsRouter);
app.use("/api/external", externalApiRouter);
app.use("/api/ai", aiProviderRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === "production" ? "Server error" : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
