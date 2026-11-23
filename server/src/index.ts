import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { prisma } from "./lib/prisma.js";
import authRoutes from "./routes/auth.routes.js";
import commandCenterRoutes from "./routes/commandCenter.routes.js";
import tasksEventsRoutes from "./routes/tasksEvents.routes.js";
import calendarRoutes from "./routes/calendar.routes.js";
import habitsRoutes from "./routes/habits.routes.js";
import financeRoutes from "./routes/finance.routes.js";
import contactsRoutes from "./routes/contacts.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import emailRoutes from "./routes/email.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Parse allowed origins from CLIENT_URL (supports comma-separated origins)
const rawOrigins = process.env.CLIENT_URL || "http://localhost:5173";
const allowedOrigins = rawOrigins
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile, curl, health-check probes)
      if (!origin) return callback(null, true);

      const normalized = origin.replace(/\/+$/, "");

      // 1. Explicitly configured origins
      if (allowedOrigins.includes(normalized)) {
        return callback(null, true);
      }

      // 2. Development localhost / loopback
      if (
        process.env.NODE_ENV !== "production" &&
        (normalized.includes("localhost") || normalized.includes("127.0.0.1"))
      ) {
        return callback(null, true);
      }

      // 3. Vercel deployment & preview branches (*.vercel.app)
      if (normalized.endsWith(".vercel.app")) {
        return callback(null, true);
      }

      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/command-center", commandCenterRoutes);
app.use("/api/tasks-events", tasksEventsRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/habits", habitsRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/emails", emailRoutes);

// Healthcheck endpoints (handles root /, /health, and /api/health for Render/monitoring)
app.get(["/", "/health", "/api/health"], async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "healthy",
      service: "point001-api",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    res.status(500).json({
      status: "degraded",
      service: "point001-api",
      version: "1.0.0",
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`
======================================================
  point001 API Server — Production Ready
  Port:        ${PORT}
  Environment: ${process.env.NODE_ENV || "development"}
  Origins:     ${allowedOrigins.join(", ")}
  Timestamp:   ${new Date().toISOString()}
======================================================
`);
});
