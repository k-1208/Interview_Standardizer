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

dotenv.config();

const app = express();
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    callback(null, origin);
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/user", userRoutes);
app.use("/api/candidates", candidateRoutes);
app.use("/api/webhooks", webhookRoutes);

export default app;