import express from "express";
import cors from "cors";
import { WEB_ORIGIN } from "./env.js";
import { verifyJwt } from "./middleware/verifyJwt.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: WEB_ORIGIN }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Every other /api route requires a valid Supabase JWT.
  app.use("/api", verifyJwt);

  return app;
}
