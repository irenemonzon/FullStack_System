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
  tags: ["Health"],
  responses: {
    200: {
      description: "OK",
      content: { "application/json": { schema: z.object({ status: z.string() }) } },
    },
  },
});

// Descriptions shown under each collapsible group in /api/docs. Order here
// is also the order Swagger UI renders the groups in.
const tags = [
  { name: "Health", description: "Unauthenticated liveness check." },
  {
    name: "Auth",
    description:
      "Dev/testing convenience only. The real frontend authenticates via the Supabase JS SDK directly (email/password), never through the API.",
  },
  {
    name: "Guests",
    description: "Register drop-in-centre guests and search/match returning ones by name, birth date, postcode, or phone.",
  },
  {
    name: "Visits",
    description: "One visit per guest per drop-in — the container the services given during that visit are logged against.",
  },
  {
    name: "Services",
    description:
      "What a guest received during a visit: kitchen/material_aid items (transactionally decrement mock stock) or an information/signposting entry.",
  },
  {
    name: "Inventory",
    description: "The item catalogue volunteers pick from at the kitchen/material-aid stations, including mock stock counts.",
  },
  { name: "Categories", description: "Grouping for inventory items (e.g. hot meals, clothing), filterable by station." },
  {
    name: "Support Categories",
    description: "The fixed list of support types (Housing, Health, Legal, …) guests can be signposted to at the information station.",
  },
  {
    name: "Reports",
    description: "Reach summaries (unique guests, visits, new vs returning, items given, supports signposted). Admin/lead only.",
  },
  {
    name: "Users",
    description: "Volunteer/admin accounts. Provisioning, role changes, and deactivation are admin only; GET /users/me is open to any signed-in user.",
  },
];

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: { title: "Support Hub API", version: "1.0.0" },
    servers: [{ url: "/api" }],
    tags,
  });
}
