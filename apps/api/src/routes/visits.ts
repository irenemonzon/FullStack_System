import { Router } from "express";
import { eq, and, gte, lt, inArray } from "drizzle-orm";
import { z } from "zod";
import { createVisitSchema, updateVisitSchema, visitQuerySchema, visitSchema } from "@support-hub/shared";
import { withAuth, schema } from "../lib/db.js";
import { registry } from "../lib/openapi.js";

const { visits, services, serviceSupports } = schema;
const router = Router();

registry.registerPath({
  method: "post",
  path: "/visits",
  description: "Start a visit for a registered guest",
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: createVisitSchema } } } },
  responses: { 201: { description: "Created", content: { "application/json": { schema: visitSchema } } } },
});

router.post("/", async (req, res) => {
  const parsed = createVisitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    return;
  }

  const [row] = await withAuth(req.auth!, (tx) =>
    tx
      .insert(visits)
      .values({ ...parsed.data, volunteerId: req.auth!.userId })
      .returning(),
  );
  res.status(201).json(row);
});

registry.registerPath({
  method: "get",
  path: "/visits/{id}",
  description: "Read a visit with its logged services (visit summary)",
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: { 200: { description: "Visit with services" }, 404: { description: "Not found" } },
});

router.get("/:id", async (req, res) => {
  const result = await withAuth(req.auth!, async (tx) => {
    const [visit] = await tx.select().from(visits).where(eq(visits.id, req.params.id));
    if (!visit) return null;
    const visitServices = await tx.select().from(services).where(eq(services.visitId, req.params.id));

    // Information rows need their linked supports for the recap screens —
    // service_supports isn't otherwise reachable from a plain services read.
    const informationServiceIds = visitServices.filter((s) => s.station === "information").map((s) => s.id);
    const supportLinks = informationServiceIds.length
      ? await tx.select().from(serviceSupports).where(inArray(serviceSupports.serviceId, informationServiceIds))
      : [];

    const servicesWithSupports = visitServices.map((service) => ({
      ...service,
      supportCategoryIds: supportLinks.filter((l) => l.serviceId === service.id).map((l) => l.supportCategoryId),
    }));

    return { ...visit, services: servicesWithSupports };
  });
  if (!result) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(result);
});

registry.registerPath({
  method: "patch",
  path: "/visits/{id}",
  description: "Update a visit's status (e.g. finished) or notes",
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: updateVisitSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: visitSchema } } },
    404: { description: "Not found" },
  },
});

router.patch("/:id", async (req, res) => {
  const parsed = updateVisitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    return;
  }

  const [row] = await withAuth(req.auth!, (tx) =>
    tx.update(visits).set(parsed.data).where(eq(visits.id, req.params.id)).returning(),
  );
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

registry.registerPath({
  method: "get",
  path: "/visits",
  description: "List a day's visits",
  security: [{ bearerAuth: [] }],
  request: { query: visitQuerySchema },
  responses: { 200: { description: "Visits", content: { "application/json": { schema: z.array(visitSchema) } } } },
});

router.get("/", async (req, res) => {
  const parsed = visitQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid query" });
    return;
  }
  const { date } = parsed.data;

  const rows = await withAuth(req.auth!, (tx) => {
    const query = tx.select().from(visits).$dynamic();
    if (!date) return query;
    const start = new Date(`${date}T00:00:00.000Z`);
    const end = new Date(`${date}T23:59:59.999Z`);
    return query.where(and(gte(visits.visitedAt, start), lt(visits.visitedAt, end)));
  });
  res.json(rows);
});

export default router;
