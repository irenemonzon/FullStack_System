import { Router } from "express";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { ReachReport } from "@support-hub/shared";
import { reachReportSchema, reportQuerySchema } from "@support-hub/shared";
import { withAuth, schema } from "../lib/db.js";
import { registry } from "../lib/openapi.js";
import { requireRole } from "../middleware/requireRole.js";

const { visits, services, serviceSupports, inventoryItems, supportCategories } = schema;
const router = Router();

type Tx = Parameters<Parameters<typeof withAuth>[1]>[0];

// Shared by all three endpoints below — `from`/`to` are inclusive UTC calendar
// dates (or null for an unbounded side). "New" vs "returning" is decided by
// comparing each in-range guest's all-time earliest visit against `from`: if
// their very first visit ever falls inside the window they're new, otherwise
// they'd already visited before the window started. With no `from` bound,
// every guest counts as new (there's no earlier boundary to have returned
// across).
async function computeReachReport(tx: Tx, from: string | null, to: string | null): Promise<ReachReport> {
  const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : null;
  const toDate = to ? new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 24 * 60 * 60 * 1000) : null;

  const rangeCondition = and(
    ...[fromDate ? gte(visits.visitedAt, fromDate) : undefined, toDate ? lt(visits.visitedAt, toDate) : undefined].filter(
      (c): c is NonNullable<typeof c> => c !== undefined,
    ),
  );

  const visitRows = await tx
    .select({ id: visits.id, guestId: visits.guestId })
    .from(visits)
    .where(rangeCondition);

  const visitIds = visitRows.map((v) => v.id);
  const guestIds = [...new Set(visitRows.map((v) => v.guestId))];

  const firstVisits = guestIds.length
    ? await tx
        .select({ guestId: visits.guestId, firstVisitedAt: sql<string>`min(${visits.visitedAt})` })
        .from(visits)
        .where(inArray(visits.guestId, guestIds))
        .groupBy(visits.guestId)
    : [];

  const newGuestIds = new Set(
    firstVisits
      .filter((f) => !fromDate || new Date(f.firstVisitedAt) >= fromDate)
      .map((f) => f.guestId),
  );

  const itemRows = visitIds.length
    ? await tx
        .select({
          inventoryItemId: services.inventoryItemId,
          name: inventoryItems.name,
          station: services.station,
          quantity: sql<number>`sum(${services.quantity})::int`,
        })
        .from(services)
        .innerJoin(inventoryItems, eq(services.inventoryItemId, inventoryItems.id))
        .where(and(inArray(services.visitId, visitIds), inArray(services.station, ["kitchen", "material_aid"])))
        .groupBy(services.inventoryItemId, inventoryItems.name, services.station)
    : [];

  const supportRows = visitIds.length
    ? await tx
        .select({
          supportCategoryId: serviceSupports.supportCategoryId,
          name: supportCategories.name,
          count: sql<number>`count(*)::int`,
        })
        .from(serviceSupports)
        .innerJoin(services, eq(serviceSupports.serviceId, services.id))
        .innerJoin(supportCategories, eq(serviceSupports.supportCategoryId, supportCategories.id))
        .where(inArray(services.visitId, visitIds))
        .groupBy(serviceSupports.supportCategoryId, supportCategories.name)
    : [];

  return {
    from,
    to,
    uniqueGuests: guestIds.length,
    visits: visitRows.length,
    newGuests: newGuestIds.size,
    returningGuests: guestIds.length - newGuestIds.size,
    items: itemRows.map((r) => ({
      inventoryItemId: r.inventoryItemId!,
      name: r.name,
      station: r.station as "kitchen" | "material_aid",
      quantity: r.quantity,
    })),
    supportsSignposted: supportRows,
    supportsSignpostedTotal: supportRows.reduce((sum, r) => sum + r.count, 0),
  };
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

registry.registerPath({
  method: "get",
  path: "/reports/reach",
  description: "Reach summary for a date range: unique guests, visits, new vs returning, items given, supports signposted (admin/lead only)",
  tags: ["Reports"],
  security: [{ bearerAuth: [] }],
  request: { query: reportQuerySchema },
  responses: {
    200: { description: "Reach report", content: { "application/json": { schema: reachReportSchema } } },
    403: { description: "Forbidden — admin/lead only" },
  },
});

router.get("/reach", requireRole("admin", "lead"), async (req, res) => {
  const parsed = reportQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid query" });
    return;
  }
  const { from, to } = parsed.data;
  if (from && to && from > to) {
    res.status(400).json({ error: "from must not be after to" });
    return;
  }
  const report = await withAuth(req.auth!, (tx) => computeReachReport(tx, from ?? null, to ?? null));
  res.json(report);
});

registry.registerPath({
  method: "get",
  path: "/reports/weekly",
  description: "Reach summary for the trailing 7 days (admin/lead only)",
  tags: ["Reports"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Reach report", content: { "application/json": { schema: reachReportSchema } } },
    403: { description: "Forbidden — admin/lead only" },
  },
});

router.get("/weekly", requireRole("admin", "lead"), async (req, res) => {
  const to = new Date();
  const from = new Date(to.getTime() - 6 * 24 * 60 * 60 * 1000);
  const report = await withAuth(req.auth!, (tx) =>
    computeReachReport(tx, toDateOnly(from), toDateOnly(to)),
  );
  res.json(report);
});

registry.registerPath({
  method: "get",
  path: "/reports/monthly",
  description: "Reach summary for the trailing 30 days (admin/lead only)",
  tags: ["Reports"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Reach report", content: { "application/json": { schema: reachReportSchema } } },
    403: { description: "Forbidden — admin/lead only" },
  },
});

router.get("/monthly", requireRole("admin", "lead"), async (req, res) => {
  const to = new Date();
  const from = new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
  const report = await withAuth(req.auth!, (tx) =>
    computeReachReport(tx, toDateOnly(from), toDateOnly(to)),
  );
  res.json(report);
});

export default router;
