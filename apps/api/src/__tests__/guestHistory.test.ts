import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { withAuth, client, schema } from "../lib/db.js";
import { signIn, TEST_VOLUNTEER, TEST_ADMIN } from "./helpers.js";

const { categories, inventoryItems, guests, visits, services, serviceSupports, supportCategories } = schema;

const app = createApp();

describe("guest history", () => {
  let volunteerToken: string;
  let volunteerId: string;
  let materialAidItemId: string;
  let supportCategoryId: string;
  let guestId: string;
  // Oldest first, as inserted.
  const visitIds: string[] = [];

  beforeAll(async () => {
    volunteerToken = await signIn(TEST_VOLUNTEER.email, TEST_VOLUNTEER.password);
    const [v] = await client`select id from public.users where email = ${TEST_VOLUNTEER.email}`;
    const [a] = await client`select id from public.users where email = ${TEST_ADMIN.email}`;
    volunteerId = v.id;
    const admin = { userId: a.id, role: "admin" };
    const volunteer = { userId: volunteerId, role: "volunteer" };

    const [category] = await withAuth(admin, (tx) =>
      tx.insert(categories).values({ station: "material_aid", name: "History Test Category" }).returning(),
    );
    const [item] = await withAuth(admin, (tx) =>
      tx
        .insert(inventoryItems)
        .values({ categoryId: category.id, name: "History Test Item", unit: "item", quantityOnHand: 5 })
        .returning(),
    );
    materialAidItemId = item.id;
    const [support] = await withAuth(admin, (tx) =>
      tx.insert(supportCategories).values({ name: "History Test Support" }).returning(),
    );
    supportCategoryId = support.id;

    const [guest] = await withAuth(volunteer, (tx) =>
      tx.insert(guests).values({ displayName: "History Test Guest", gender: "prefer_not_to_say" }).returning(),
    );
    guestId = guest.id;

    // Six visits a day apart, so one page of 5 leaves exactly one over.
    for (let daysAgo = 6; daysAgo >= 1; daysAgo--) {
      const [visit] = await withAuth(volunteer, (tx) =>
        tx
          .insert(visits)
          .values({ guestId, volunteerId, visitedAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000) })
          .returning(),
      );
      visitIds.push(visit.id);
    }

    // Most recent visit: 2 material aid items + 1 information referral.
    const latestVisitId = visitIds[visitIds.length - 1];
    await withAuth(volunteer, async (tx) => {
      await tx
        .insert(services)
        .values({ visitId: latestVisitId, station: "material_aid", inventoryItemId: materialAidItemId, quantity: 2 });
      const [info] = await tx
        .insert(services)
        .values({ visitId: latestVisitId, station: "information", details: { notes: "History test" } })
        .returning();
      await tx.insert(serviceSupports).values({ serviceId: info.id, supportCategoryId });
    });
  });

  afterAll(async () => {
    await client`delete from service_supports where service_id in (select id from services where visit_id in (select id from visits where guest_id = ${guestId}))`;
    await client`delete from services where visit_id in (select id from visits where guest_id = ${guestId})`;
    await client`delete from visits where guest_id = ${guestId}`;
    await client`delete from guests where id = ${guestId}`;
    await client`delete from inventory_items where id = ${materialAidItemId}`;
    await client`delete from categories where name = 'History Test Category'`;
    await client`delete from support_categories where id = ${supportCategoryId}`;
  });

  it("returns lifetime totals and the first page of visits, most recent first", async () => {
    const res = await request(app)
      .get(`/api/guests/${guestId}/history`)
      .set("Authorization", `Bearer ${volunteerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totals).toMatchObject({ visits: 6, kitchen: 0, materialAid: 2, information: 1 });
    expect(res.body.totals.firstVisitAt).toBeTruthy();
    expect(res.body.hasMore).toBe(true);
    expect(res.body.visits.map((v: { id: string }) => v.id)).toEqual(visitIds.slice(1).reverse());

    const latest = res.body.visits[0];
    expect(latest.services).toHaveLength(2);
    const info = latest.services.find((s: { station: string }) => s.station === "information");
    expect(info.supportCategoryIds).toEqual([supportCategoryId]);
  });

  it("pages with offset", async () => {
    const res = await request(app)
      .get(`/api/guests/${guestId}/history?offset=5`)
      .set("Authorization", `Bearer ${volunteerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.visits.map((v: { id: string }) => v.id)).toEqual([visitIds[0]]);
    expect(res.body.visits[0].services).toEqual([]);
    expect(res.body.hasMore).toBe(false);
  });

  it("rejects an invalid limit", async () => {
    const res = await request(app)
      .get(`/api/guests/${guestId}/history?limit=0`)
      .set("Authorization", `Bearer ${volunteerToken}`);
    expect(res.status).toBe(400);
  });
});
