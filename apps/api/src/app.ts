import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { WEB_ORIGIN } from "./env.js";
import { verifyJwt } from "./middleware/verifyJwt.js";
import { generateOpenApiDocument } from "./lib/openapi.js";
import guestsRouter from "./routes/guests.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: WEB_ORIGIN }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Docs are unauthenticated too, same as /api/health.
  app.get("/api/openapi.json", (_req, res) => {
    res.json(generateOpenApiDocument());
  });
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(generateOpenApiDocument()));

  // Every other /api route requires a valid Supabase JWT.
  app.use("/api", verifyJwt);

  app.use("/api/guests", guestsRouter);

  return app;
}
