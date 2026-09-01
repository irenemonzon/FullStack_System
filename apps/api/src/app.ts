import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { WEB_ORIGIN } from "./env.js";
import { verifyJwt } from "./middleware/verifyJwt.js";
import { generateOpenApiDocument } from "./lib/openapi.js";
import authRouter from "./routes/auth.js";
import guestsRouter from "./routes/guests.js";
import inventoryRouter from "./routes/inventory.js";
import categoriesRouter from "./routes/categories.js";
import supportCategoriesRouter from "./routes/supportCategories.js";
import visitsRouter from "./routes/visits.js";
import servicesRouter from "./routes/services.js";

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

  // Dev/testing convenience — unauthenticated by necessity (it's how
  // you get a token in the first place). See routes/auth.ts.
  app.use("/api/auth", authRouter);

  // Every other /api route requires a valid Supabase JWT.
  app.use("/api", verifyJwt);

  app.use("/api/guests", guestsRouter);
  app.use("/api/inventory", inventoryRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/support-categories", supportCategoriesRouter);
  app.use("/api/visits", visitsRouter);
  // POST /api/visits/:id/services + DELETE /api/services/:id (services.ts
  // defines both full paths itself, so it's mounted at the bare /api root).
  app.use("/api", servicesRouter);

  return app;
}
