import { Router } from "express";
import { and, eq, ne, desc, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import {
  createGuestSchema,
  updateGuestSchema,
  guestSearchQuerySchema,
  guestSchema,
  guestHistoryQuerySchema,
  createGuestQuerySchema,
  duplicateGuestsResponseSchema,
  updateGuestResponseSchema,
  type CreateGuestInput,
} from "@support-hub/shared";
import { withAuth, schema, type Tx } from "../lib/db.js";
import { loadServicesByVisit } from "../lib/visitServices.js";
import { registry } from "../lib/openapi.js";

const { guests, visits, services } = schema;

const router = Router();

registry.registerPath({
  method: "get",
  path: "/guests",
  description:
    "Call with no query parameters to list the 50 most recently registered guests. Give any filter (firstName, birthDate, postcode, phone) instead to run a ranked returning-guest match search.",
  tags: ["Guests"],
  security: [{ bearerAuth: [] }],
  request: { query: guestSearchQuerySchema },
  responses: {
    200: {
      description: "All guests (no filters) or ranked matches (filters given)",
      content: { "application/json": { schema: z.array(guestSchema) } },
    },
  },
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
        lastVisitAt: sql<string | null>`(select max(v.visited_at) from ${visits} v where v.guest_id = guests.id)`,
        lastVisitId: sql<string | null>`(select v.id from ${visits} v where v.guest_id = guests.id order by v.visited_at desc limit 1)`,
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
  description:
    "Register a guest (name, gender and postcode required; nothing else is). Rejected with 409 if an existing guest has the same phone number, or the same name plus the same birth date or postcode — pass allowDuplicate=true once the volunteer has confirmed it's a different person.",
  tags: ["Guests"],
  security: [{ bearerAuth: [] }],
  request: {
    query: createGuestQuerySchema,
    body: { content: { "application/json": { schema: createGuestSchema } } },
  },
  responses: {
    201: { description: "Created", content: { "application/json": { schema: guestSchema } } },
    400: { description: "Invalid body or query" },
    409: {
      description: "Possible duplicates found (up to 5, newest first); the guest was not created",
      content: { "application/json": { schema: duplicateGuestsResponseSchema } },
    },
  },
});

// Comparison forms for duplicate detection: names ignore case and extra
// spaces, phones compare digits only ("0412 345 678" = "0412345678"),
// postcodes ignore case and surrounding spaces.
const normalisedName = sql`lower(regexp_replace(trim(${guests.displayName}), '\\s+', ' ', 'g'))`;
const normalisedPhone = sql`regexp_replace(coalesce(${guests.phone}, ''), '\\D', '', 'g')`;
const normalisedPostcode = sql`upper(trim(coalesce(${guests.postcode}, '')))`;

type MatchField = "phone" | "name" | "birthDate" | "postcode";

// A possible duplicate is a guest with the same phone number, or the same
// name plus the same birth date or postcode. Name alone isn't enough —
// different people share common names.
async function findPossibleDuplicates(tx: Tx, input: CreateGuestInput) {
  const name = input.displayName.trim().replace(/\s+/g, " ").toLowerCase();
  const phone = input.phone?.replace(/\D/g, "") ?? "";
  const postcode = input.postcode?.trim().toUpperCase() ?? "";

  const nameAnd: SQL[] = [];
  if (input.birthDate) nameAnd.push(sql`${guests.birthDate} = ${input.birthDate}`);
  if (postcode) nameAnd.push(sql`${normalisedPostcode} = ${postcode}`);

  const conditions: SQL[] = [];
  if (phone) conditions.push(sql`${normalisedPhone} = ${phone}`);
  if (nameAnd.length) conditions.push(sql`(${normalisedName} = ${name} and (${sql.join(nameAnd, sql` or `)}))`);
  if (conditions.length === 0) return [];

  const rows = await tx
    .select()
    .from(guests)
    .where(sql.join(conditions, sql` or `))
    .orderBy(desc(guests.createdAt))
    .limit(5);

  return rows.map((row) => {
    const matchedOn: MatchField[] = [];
    if (phone && row.phone?.replace(/\D/g, "") === phone) matchedOn.push("phone");
    if (row.displayName.trim().replace(/\s+/g, " ").toLowerCase() === name) matchedOn.push("name");
    if (input.birthDate && row.birthDate === input.birthDate) matchedOn.push("birthDate");
    if (postcode && row.postcode?.trim().toUpperCase() === postcode) matchedOn.push("postcode");
    return { ...row, matchedOn };
  });
}

router.post("/", async (req, res) => {
  const parsed = createGuestSchema.safeParse(req.body);
  const query = createGuestQuerySchema.safeParse(req.query);
  if (!parsed.success || !query.success) {
    const issue = (parsed.error ?? query.error)?.issues[0];
    res.status(400).json({ error: issue?.message ?? "Invalid request" });
    return;
  }
  const allowDuplicate = query.data.allowDuplicate === "true";

  const result = await withAuth(req.auth!, async (tx) => {
    if (!allowDuplicate) {
      const duplicates = await findPossibleDuplicates(tx, parsed.data);
      if (duplicates.length) return { duplicates };
    }
    const [row] = await tx
      .insert(guests)
      .values({ ...parsed.data, createdBy: req.auth!.userId })
      .returning();
    return { row };
  });

  if ("duplicates" in result) {
    res.status(409).json({ error: "This guest may already be registered", duplicates: result.duplicates });
    return;
  }
  res.status(201).json(result.row);
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
  description:
    "Edit a guest's profile; send null to clear an optional field (name, gender and postcode can't be cleared). Always saves — if the phone number was changed to one other guests also have, they're listed in phoneSharedWith so the volunteer can be told.",
  tags: ["Guests"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: { content: { "application/json": { schema: updateGuestSchema } } },
  },
  responses: {
    200: { description: "Updated", content: { "application/json": { schema: updateGuestResponseSchema } } },
    400: { description: "Invalid body" },
    404: { description: "Not found" },
  },
});

router.patch("/:id", async (req, res) => {
  const parsed = updateGuestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid body" });
    return;
  }

  const result = await withAuth(req.auth!, async (tx) => {
    const [before] = await tx.select({ phone: guests.phone }).from(guests).where(eq(guests.id, req.params.id));
    if (!before) return null;

    const [row] = await tx
      .update(guests)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(guests.id, req.params.id))
      .returning();

    // Only a changed phone is reported, so editing e.g. notes doesn't keep
    // warning about a number that was already shared.
    const phone = row.phone?.replace(/\D/g, "") ?? "";
    const phoneChanged = phone !== "" && phone !== (before.phone?.replace(/\D/g, "") ?? "");
    const phoneSharedWith = phoneChanged
      ? await tx
          .select()
          .from(guests)
          .where(and(sql`${normalisedPhone} = ${phone}`, ne(guests.id, row.id)))
          .orderBy(desc(guests.createdAt))
          .limit(5)
      : [];
    return { ...row, phoneSharedWith };
  });
  if (!result) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(result);
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

registry.registerPath({
  method: "get",
  path: "/guests/{id}/history",
  description:
    "A guest's help history for their profile page: lifetime totals per station plus one page of visits (most recent first), each with its logged services",
  tags: ["Guests", "Visits"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.string().uuid() }), query: guestHistoryQuerySchema },
  responses: { 200: { description: "Totals and a page of visits with services" }, 400: { description: "Invalid query" } },
});

router.get("/:id/history", async (req, res) => {
  const parsed = guestHistoryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid query" });
    return;
  }
  const { limit, offset } = parsed.data;
  const guestId = req.params.id;

  const result = await withAuth(req.auth!, async (tx) => {
    // Kitchen/material aid count items given (sum of quantities);
    // information counts signposting entries, which carry no quantity.
    const [totals] = await tx
      .select({
        visits: sql<number>`count(distinct ${visits.id})::int`,
        firstVisitAt: sql<string | null>`min(${visits.visitedAt})`,
        kitchen: sql<number>`coalesce(sum(${services.quantity}) filter (where ${services.station} = 'kitchen'), 0)::int`,
        materialAid: sql<number>`coalesce(sum(${services.quantity}) filter (where ${services.station} = 'material_aid'), 0)::int`,
        information: sql<number>`(count(${services.id}) filter (where ${services.station} = 'information'))::int`,
      })
      .from(visits)
      .leftJoin(services, eq(services.visitId, visits.id))
      .where(eq(visits.guestId, guestId));

    // Fetch one extra row to know whether there's another page.
    const page = await tx
      .select()
      .from(visits)
      .where(eq(visits.guestId, guestId))
      .orderBy(desc(visits.visitedAt))
      .limit(limit + 1)
      .offset(offset);
    const pageVisits = page.slice(0, limit);
    const servicesByVisit = await loadServicesByVisit(
      tx,
      pageVisits.map((v) => v.id),
    );

    return {
      totals,
      visits: pageVisits.map((v) => ({ ...v, services: servicesByVisit.get(v.id) ?? [] })),
      hasMore: page.length > limit,
    };
  });
  res.json(result);
});

export default router;
