import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { PrismaClient } from "@prisma/client";
import reviewsRouter from "./routes/reviews.js";
import standardsRouter from "./routes/standards.js";
import llmService from "./services/llmService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Prisma
export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "error", "warn"]
      : ["error"],
});

prisma
  .$connect()
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("Database connection failed:", err));

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
  const llmHealth = await llmService.checkHealth();
  res.json({
    status: "ok",
    llm: llmHealth,
  });
});

// Routes
app.use("/api/reviews", reviewsRouter);
app.use("/api/standards", standardsRouter);

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
