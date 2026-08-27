import { describe, it, expect, beforeAll } from "vitest";
import { eq } from "drizzle-orm";
import { withAuth, client, schema } from "../lib/db.js";
import { TEST_VOLUNTEER, TEST_ADMIN } from "./helpers.js";

const { guests, categories, inventoryItems } = schema;

let volunteerId: string;
let adminId: string;

beforeAll(async () => {
  const [v] = await client`select id from public.users where email = ${TEST_VOLUNTEER.email}`;
  const [a] = await client`select id from public.users where email = ${TEST_ADMIN.email}`;
  if (!v || !a) throw new Error("Test accounts not provisioned in public.users — see Sprint 2 setup.");
  volunteerId = v.id;
  adminId = a.id;
});

describe("Row Level Security", () => {
  it("lets a volunteer create a guest, and the audit trigger records it", async () => {
    const [row] = await withAuth({ userId: volunteerId, role: "volunteer" }, (db) =>
      db.insert(guests).values({ displayName: "RLS Test Guest", gender: "prefer_not_to_say" }).returning(),
    );
    expect(row.id).toBeDefined();

    const [auditRow] = await client`
      select * from audit_log where table_name = 'guests' and row_id = ${row.id} and action = 'insert'
    `;
    expect(auditRow).toBeDefined();

    await client`delete from guests where id = ${row.id}`;
  });

  it("blocks a volunteer from creating an inventory item", async () => {
    const [category] = await withAuth({ userId: adminId, role: "admin" }, (db) =>
      db.insert(categories).values({ station: "kitchen", name: "RLS Test Category A" }).returning(),
    );

    await expect(
      withAuth({ userId: volunteerId, role: "volunteer" }, (db) =>
        db.insert(inventoryItems).values({ categoryId: category.id, name: "RLS Test Item", unit: "unit" }).returning(),
      ),
    ).rejects.toThrow();

    await client`delete from categories where id = ${category.id}`;
  });

  it("lets an admin create an inventory item", async () => {
    const [category] = await withAuth({ userId: adminId, role: "admin" }, (db) =>
      db.insert(categories).values({ station: "kitchen", name: "RLS Test Category B" }).returning(),
    );
    const [item] = await withAuth({ userId: adminId, role: "admin" }, (db) =>
      db
        .insert(inventoryItems)
        .values({ categoryId: category.id, name: "RLS Test Item B", unit: "unit" })
        .returning(),
    );
    expect(item.id).toBeDefined();

    await client`delete from inventory_items where id = ${item.id}`;
    await client`delete from categories where id = ${category.id}`;
  });

  it("lets a volunteer adjust quantity_on_hand but blocks changing other catalogue fields", async () => {
    const [category] = await withAuth({ userId: adminId, role: "admin" }, (db) =>
      db.insert(categories).values({ station: "kitchen", name: "RLS Test Category C" }).returning(),
    );
    const [item] = await withAuth({ userId: adminId, role: "admin" }, (db) =>
      db
        .insert(inventoryItems)
        .values({ categoryId: category.id, name: "RLS Test Item C", unit: "unit", quantityOnHand: 10 })
        .returning(),
    );

    await withAuth({ userId: volunteerId, role: "volunteer" }, (db) =>
      db.update(inventoryItems).set({ quantityOnHand: 8 }).where(eq(inventoryItems.id, item.id)),
    );
    const [afterStockUpdate] = await client`select quantity_on_hand from inventory_items where id = ${item.id}`;
    expect(afterStockUpdate.quantity_on_hand).toBe(8);

    await expect(
      withAuth({ userId: volunteerId, role: "volunteer" }, (db) =>
        db.update(inventoryItems).set({ name: "Hacked name" }).where(eq(inventoryItems.id, item.id)),
      ),
    ).rejects.toThrow();

    await client`delete from inventory_items where id = ${item.id}`;
    await client`delete from categories where id = ${category.id}`;
  });
});
