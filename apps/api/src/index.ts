import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { publicRouter } from "./public.ts";
import { adminRouter } from "./admin.ts";
import { q } from "./db.ts";

const app = express();
const port = parseInt(process.env.PORT || "4000", 10);

const webOrigin = process.env.PUBLIC_ORIGIN || "http://localhost:5173";
const adminOrigin = process.env.ADMIN_ORIGIN || "http://localhost:5174";

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration for separate public & admin domains
const allowedOrigins = [webOrigin, adminOrigin, "http://localhost:3000", "http://localhost:5173", "http://localhost:5174"];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Dev convenience
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Rate limiting for public and admin auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many authentication attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/admin/auth/login", authLimiter);
app.use("/api/admin/auth/forgot-password", authLimiter);

// Serve uploaded media files reliably from root or apps/api
const rootUploads = join(process.cwd(), "uploads");
const parentUploads = join(process.cwd(), "..", "..", "uploads");
const staticUploads = existsSync(rootUploads) ? rootUploads : parentUploads;
app.use("/uploads", express.static(staticUploads));

// Health check
app.get("/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Mount Public and Admin Routers
app.use("/api", publicRouter);
app.use("/api/admin", adminRouter);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled API error:", err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// Periodic background worker: publish scheduled articles & announcements every minute
setInterval(async () => {
  try {
    await q("UPDATE news_articles SET status='published', published_at=now() WHERE status='scheduled' AND publish_at <= now()");
    await q("UPDATE announcements SET status='published', published_at=now() WHERE status='scheduled' AND publish_at <= now()");
  } catch (e) {
    console.error("Error in scheduler tick:", e);
  }
}, 60 * 1000);

app.listen(port, () => {
  console.log(`⚽ Sebei Province Football API listening on port ${port}`);
  console.log(`   Public Web: ${webOrigin}`);
  console.log(`   Admin Console: ${adminOrigin}`);
});

export default app;
