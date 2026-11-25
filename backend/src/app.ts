import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import developerRoutes from "./routes/developer.routes";
import adminRoutes from "./routes/admin.routes";
import studentRoutes from "./routes/student.routes";
import { authenticate, enforcePasswordReset } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/error";

export function createApp() {
  const app = express();

  // Security headers
  app.use(helmet());

  // Behind a reverse proxy (Railway/Render/Nginx) so req.ip is the real client
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(","),
    })
  );
  app.use(express.json({ limit: "1mb" }));

  // Rate limits
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later" },
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10, // brute-force protection on login/reset
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many attempts, please try again in 15 minutes" },
  });

  app.use(globalLimiter);
  app.get("/health", (_req, res) => res.json({ ok: true, service: "dlms-backend" }));
  app.use("/auth/login", authLimiter);
  app.use("/auth/reset-password", authLimiter);

  // Auth: login is public; everything else requires a token.
  // Password-reset enforcement applies to all authenticated routes.
  app.use("/auth", authRoutes);
  app.use(authenticate, enforcePasswordReset);

  app.use("/developer", developerRoutes);
  app.use("/admin", adminRoutes);
  app.use("/student", studentRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
