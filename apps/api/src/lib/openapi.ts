import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

// Every route except /api/health requires this (see apps/api/src/middleware/verifyJwt.ts)
registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

registry.registerPath({
  method: "get",
  path: "/health",
  description: "Unauthenticated liveness check",
  responses: {
    200: {
      description: "OK",
      content: { "application/json": { schema: z.object({ status: z.string() }) } },
    },
  },
});

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: { title: "Support Hub API", version: "1.0.0" },
    servers: [{ url: "/api" }],
  });
}
