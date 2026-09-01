import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { withAuth, client, schema } from "../lib/db.js";
import { signIn, TEST_VOLUNTEER, TEST_ADMIN } from "./helpers.js";

const { categories, inventoryItems, guests, visits, supportCategories } = schema;

const app = createApp();

describe("services logging (transactional core)", () => {
  let volunteerToken: string;
  let volunteerId: string;
  let adminId: string;
  let materialAidItemId: string;
  let guestId: string;
  let visitId: string;
  let supportCategoryId: string;

  beforeAll(async () => {
    volunteerToken = await signIn(TEST_VOLUNTEER.email, TEST_VOLUNTEER.password);
    await signIn(TEST_ADMIN.email, TEST_ADMIN.password);
    const [v] = await client`select id from public.users where email = ${TEST_VOLUNTEER.email}`;
    const [a] = await client`select id from public.users where email = ${TEST_ADMIN.email}`;
    volunteerId = v.id;
    adminId = a.id;

    // Catalogue rows (categories/inventory_items/support_categories) are
    // admin/lead-writable only per RLS — see 0001_rls_policies.sql.
    const [category] = await withAuth({ userId: adminId, role: "admin" }, (tx) =>
      tx.insert(categories).values({ station: "material_aid", name: "Services Test Category" }).returning(),
    );
    const [item] = await withAuth({ userId: adminId, role: "admin" }, (tx) =>
      tx
        .insert(inventoryItems)
        .values({ categoryId: category.id, name: "Services Test Item", unit: "item", quantityOnHand: 5 })
        .returning(),
    );
    materialAidItemId = item.id;

    const [guest] = await withAuth({ userId: volunteerId, role: "volunteer" }, (tx) =>
      tx.insert(guests).values({ displayName: "Services Test Guest", gender: "prefer_not_to_say" }).returning(),
    );
    guestId = guest.id;

    const [visit] = await withAuth({ userId: volunteerId, role: "volunteer" }, (tx) =>
      tx.insert(visits).values({ guestId, volunteerId }).returning(),
    );
    visitId = visit.id;

    const [support] = await withAuth({ userId: adminId, role: "admin" }, (tx) =>
      tx.insert(supportCategories).values({ name: "Services Test Support" }).returning(),
    );
    supportCategoryId = support.id;
  });

  afterAll(async () => {
    await client`delete from service_supports where service_id in (select id from services where visit_id = ${visitId})`;
    await client`delete from services where visit_id = ${visitId}`;
    await client`delete from visits where id = ${visitId}`;
    await client`delete from guests where id = ${guestId}`;
    await client`delete from inventory_items where id = ${materialAidItemId}`;
    await client`delete from categories where name = 'Services Test Category'`;
    await client`delete from support_categories where id = ${supportCategoryId}`;
  });

  it("rejects an invalid body (Zod validation)", async () => {
    const res = await request(app)
      .post(`/api/visits/${visitId}/services`)
      .set("Authorization", `Bearer ${volunteerToken}`)
      .send({ station: "material_aid", quantity: 1 }); // missing inventoryItemId
    expect(res.status).toBe(400);
  });

  it("logs a material_aid service and decrements quantity_on_hand atomically", async () => {
    const res = await request(app)
      .post(`/api/visits/${visitId}/services`)
      .set("Authorization", `Bearer ${volunteerToken}`)
      .send({ station: "material_aid", inventoryItemId: materialAidItemId, quantity: 2 });
    expect(res.status).toBe(201);
    expect(res.body.quantity).toBe(2);

    const [item] = await client`select quantity_on_hand from inventory_items where id = ${materialAidItemId}`;
    expect(item.quantity_on_hand).toBe(3);

    // Clean up this row via the route under test below (delete/undo test),
    // so leave it in place for now.
    const serviceId: string = res.body.id;

    // Rejects logging more than remains in stock.
    const rejectRes = await request(app)
      .post(`/api/visits/${visitId}/services`)
      .set("Authorization", `Bearer ${volunteerToken}`)
      .send({ station: "material_aid", inventoryItemId: materialAidItemId, quantity: 10 });
    expect(rejectRes.status).toBe(409);

    const [itemAfterReject] = await client`select quantity_on_hand from inventory_items where id = ${materialAidItemId}`;
    expect(itemAfterReject.quantity_on_hand).toBe(3);
    const [servicesAfterReject] = await client`select count(*)::int from services where visit_id = ${visitId}`;
    expect(servicesAfterReject.count).toBe(1);

    // Undo restores stock.
    const deleteRes = await request(app)
      .delete(`/api/services/${serviceId}`)
      .set("Authorization", `Bearer ${volunteerToken}`);
    expect(deleteRes.status).toBe(204);

    const [itemAfterDelete] = await client`select quantity_on_hand from inventory_items where id = ${materialAidItemId}`;
    expect(itemAfterDelete.quantity_on_hand).toBe(5);
  });

  it("logs an information service with service_supports and no inventory row touched", async () => {
    const res = await request(app)
      .post(`/api/visits/${visitId}/services`)
      .set("Authorization", `Bearer ${volunteerToken}`)
      .send({ station: "information", supportCategoryIds: [supportCategoryId], notes: "Referred to housing support" });
    expect(res.status).toBe(201);

    const supportRows = await client`select * from service_supports where service_id = ${res.body.id}`;
    expect(supportRows).toHaveLength(1);
    expect(supportRows[0].support_category_id).toBe(supportCategoryId);

    const deleteRes = await request(app)
      .delete(`/api/services/${res.body.id}`)
      .set("Authorization", `Bearer ${volunteerToken}`);
    expect(deleteRes.status).toBe(204);
  });
});
