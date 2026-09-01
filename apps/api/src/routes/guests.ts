import { Router } from "express";
import { eq, desc, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { createGuestSchema, updateGuestSchema, guestSearchQuerySchema, guestSchema } from "@support-hub/shared";
import { withAuth, schema } from "../lib/db.js";
import { registry } from "../lib/openapi.js";

const { guests, visits } = schema;

const router = Router();

registry.registerPath({
  method: "get",
  path: "/guests",
  description:
    "Ranked returning-guest match search when any filter is given; the most recently registered guests (plain list) when none are",
  tags: ["Guests"],
  security: [{ bearerAuth: [] }],
  request: { query: guestSearchQuerySchema },
  responses: { 200: { description: "Matches or recent guests", content: { "application/json": { schema: z.array(guestSchema) } } } },
});

router.get("/", async (req, res) => {
  const parsed = guestSearchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid query" });
    return;
  }
  const { firstName, birthDate, postcode, phone } = parsed.data;

  const scoreTerms: SQL[] = [];
  const matchConditions: SQL[] = [];
  if (phone) {
    scoreTerms.push(sql`(case when ${guests.phone} = ${phone} then 100 else 0 end)`);
    matchConditions.push(sql`${guests.phone} = ${phone}`);
  }
  if (birthDate) {
    scoreTerms.push(sql`(case when ${guests.birthDate} = ${birthDate} then 50 else 0 end)`);
    matchConditions.push(sql`${guests.birthDate} = ${birthDate}`);
  }
  if (postcode) {
    scoreTerms.push(sql`(case when ${guests.postcode} = ${postcode} then 10 else 0 end)`);
    matchConditions.push(sql`${guests.postcode} = ${postcode}`);
  }
  if (firstName) {
    const pattern = `%${firstName}%`;
    scoreTerms.push(sql`(case when ${guests.displayName} ilike ${pattern} then 25 else 0 end)`);
    matchConditions.push(sql`${guests.displayName} ilike ${pattern}`);
  }

  const hasFilters = matchConditions.length > 0;
  const scoreExpr = hasFilters ? sql.join(scoreTerms, sql` + `) : sql`0`;

  const baseQuery = withAuth(req.auth!, (tx) => {
    const query = tx
      .select({
        id: guests.id,
        displayName: guests.displayName,
        gender: guests.gender,
        birthDate: guests.birthDate,
        postcode: guests.postcode,
        phone: guests.phone,
        preferredLanguage: guests.preferredLanguage,
        dietary: guests.dietary,
        notes: guests.notes,
        createdAt: guests.createdAt,
        updatedAt: guests.updatedAt,
        // Drizzle strips the table qualifier from `${guests.id}` when it's part of a
        // selected field's own SQL fragment (as opposed to a WHERE/ORDER BY clause),
        // so the naive correlated form silently resolved to `visits.guest_id = visits.id`
        // (both columns exist on `visits`) and always returned null. Aliasing the inner
        // table and writing the outer reference as a literal `guests.id` avoids the collision.
        lastVisitAt: sql<string | null>`(select max(v.visited_at) from ${visits} v where v.guest_id = guests.id)`,
        score: scoreExpr.as("score"),
      })
      .from(guests)
      .$dynamic();

    if (hasFilters) {
      return query
        .where(sql.join(matchConditions, sql` or `))
        .orderBy(desc(sql`score`))
        .limit(10);
    }
    return query.orderBy(desc(guests.createdAt)).limit(50);
  });

  res.json(await baseQuery);
});

registry.registerPath({
  method: "post",
  path: "/guests",
  description: "Register a guest (gender required, nothing else is)",
  tags: ["Guests"],
  security: [{ bearerAuth: [] }],
  request: { body: { content: { "application/json": { schema: createGuestSchema } } } },
  responses: { 201: { description: "Created", content: { "application/json": { schema: guestSchema } } } },
});

router.post("/", async (req, res) => {
  const parsed = createGuestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    return;
  }

  const [row] = await withAuth(req.auth!, (tx) =>
    tx
      .insert(guests)
      .values({ ...parsed.data, createdBy: req.auth!.userId })
      .returning(),
  );
  res.status(201).json(row);
});

registry.registerPath({
  method: "get",
  path: "/guests/{id}",
  description: "Read a guest's profile",
  tags: ["Guests"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: "Guest", content: { "application/json": { schema: guestSchema } } },
    404: { description: "Not found" },
  },
});

router.get("/:id", async (req, res) => {
  const [row] = await withAuth(req.auth!, (tx) => tx.select().from(guests).where(eq(guests.id, req.params.id)));
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

registry.registerPath({
  method: "patch",
  path: "/guests/{id}",
  description: "Edit a guest's profile",
  tags: ["Guests"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: updateGuestSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: guestSchema } } },
    404: { description: "Not found" },
  },
});

router.patch("/:id", async (req, res) => {
  const parsed = updateGuestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    return;
  }

  const [row] = await withAuth(req.auth!, (tx) =>
    tx
      .update(guests)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(guests.id, req.params.id))
      .returning(),
  );
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(row);
});

registry.registerPath({
  method: "get",
  path: "/guests/{id}/visits",
  description: "A guest's visit history, most recent first",
  tags: ["Guests", "Visits"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: { 200: { description: "Visits" } },
});

router.get("/:id/visits", async (req, res) => {
  const rows = await withAuth(req.auth!, (tx) =>
    tx.select().from(visits).where(eq(visits.guestId, req.params.id)).orderBy(desc(visits.visitedAt)),
  );
  res.json(rows);
});

export default router;
