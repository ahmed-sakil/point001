import express, { Request, Response } from "express";
import cors from "cors";
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

import config from "./lib/config.js";

const app = express();
const PORT = config.PORT;

// Parse allowed origins from CLIENT_URL (supports comma-separated origins)
const rawOrigins = config.CLIENT_URL;
const allowedOrigins = rawOrigins
  .split(",")
  .map((o) => o.trim().replace(/\/+$/, ""))
  .filter(Boolean);

// Authorized Vercel domains pattern for this project (e.g. https://point001.vercel.app, https://point001-preview.vercel.app)
const VERCEL_PROJECT_REGEX = /^https:\/\/point-?001(-[a-z0-9-]+)?\.vercel\.app$/i;

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
        config.NODE_ENV !== "production" &&
        (normalized.includes("localhost") || normalized.includes("127.0.0.1"))
      ) {
        return callback(null, true);
      }

      // 3. Authorized project Vercel deployment & preview branches (*.vercel.app for point001 only)
      if (VERCEL_PROJECT_REGEX.test(normalized)) {
        return callback(null, true);
      }

      console.warn(`[CORS] Rejected unauthorized origin: ${origin}`);
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
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch (error) {
    res.status(500).json({
      status: "degraded",
      service: "point001-api",
      version: "1.0.0",
      environment: config.NODE_ENV,
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
  Environment: ${config.NODE_ENV}
  Origins:     ${allowedOrigins.join(", ")}
  Timestamp:   ${new Date().toISOString()}
======================================================
`);
});
