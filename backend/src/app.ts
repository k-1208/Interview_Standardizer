import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import userRoutes from "./routes/user.routes.js";
import candidateRoutes from "./routes/candidate.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";
import workspaceRoutes from "./routes/workspace.routes.js";
import type { NextFunction, Request, Response } from "express";
import { HttpError, sendError } from "./utils/httpError.js";
import { checkReadiness } from "./utils/readiness.js";
import { requireCsrfHeader } from "./middleware/csrf.middleware.js";

dotenv.config();

const app = express();
const extraFrontendUrl = process.env.FRONTEND_URL?.replace(/\/$/, "");
const allowedOrigins = [
  "https://interview-standardizer.vercel.app",
  "https://interviewiq-amber.vercel.app",
  "http://localhost:3000",
  ...(extraFrontendUrl ? [extraFrontendUrl] : []),
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-Requested-With", "ngrok-skip-browser-warning"],
};

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Requested-With, ngrok-skip-browser-warning");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requireCsrfHeader);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Readiness: 200 only when Postgres and Redis are reachable (Docker healthcheck).
app.get("/ready", async (req, res) => {
  const { ready, checks } = await checkReadiness();
  res.status(ready ? 200 : 503).json({ status: ready ? "OK" : "UNAVAILABLE", checks });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/user", userRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/workspaces", workspaceRoutes);

// JSON 404 for unknown routes (instead of Express's HTML page).
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Last-resort error handler: malformed JSON bodies, CORS rejections and anything
// thrown outside a controller's try/catch. Never leaks stack traces or internals.
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return;
  const status = (err as { status?: number; type?: string })?.status;
  if ((err as { type?: string })?.type === "entity.parse.failed") {
    sendError(res, new HttpError(400, "Malformed JSON body"), "app", "");
    return;
  }
  if ((err as Error)?.message === "Not allowed by CORS") {
    sendError(res, new HttpError(403, "Origin not allowed"), "app", "");
    return;
  }
  if (typeof status === "number" && status >= 400 && status < 500) {
    sendError(res, new HttpError(status, "Bad request"), "app", "");
    return;
  }
  sendError(res, err, `app ${req.method} ${req.path}`, "Internal server error");
});

export default app;