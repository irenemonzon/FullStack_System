import { config } from "dotenv";
import { resolve } from "node:path";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../.env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");

// prepare: false — DATABASE_URL points at Supabase's pooler (port 6543,
// PgBouncer transaction mode); see apps/api/src/lib/db.ts for why.
const client = postgres(DATABASE_URL, { prepare: false });
const db = drizzle(client, { schema });

// Connects as the DB owner (bypasses RLS) — a one-off dev/admin script,
// not something the app runs at request time. Safe to re-run: it skips
// straight past anything that already exists.
async function seed() {
  const existingCategories = await db.select({ id: schema.categories.id }).from(schema.categories).limit(1);
  if (existingCategories.length > 0) {
    console.log("Categories already seeded — skipping. Truncate the tables first if you want to reseed.");
    await client.end();
    return;
  }

  const [hotMeals, pantry, clothing, toiletries, blankets] = await db
    .insert(schema.categories)
    .values([
      { station: "kitchen", name: "Hot meals" },
      { station: "kitchen", name: "Pantry" },
      { station: "material_aid", name: "Clothing" },
      { station: "material_aid", name: "Toiletries" },
      { station: "material_aid", name: "Blankets" },
    ])
    .returning();

  await db.insert(schema.inventoryItems).values([
    { categoryId: hotMeals.id, name: "Hot meal", unit: "meal", quantityOnHand: 40, lowStockThreshold: 10 },
    { categoryId: pantry.id, name: "Pantry bag", unit: "bag", quantityOnHand: 25, lowStockThreshold: 5 },
    { categoryId: pantry.id, name: "Bread", unit: "loaf", quantityOnHand: 15, lowStockThreshold: 5 },
    {
      categoryId: clothing.id,
      name: "T-shirt",
      unit: "item",
      size: "M",
      genderFit: "unisex",
      quantityOnHand: 20,
      lowStockThreshold: 5,
    },
    {
      categoryId: clothing.id,
      name: "Jacket",
      unit: "item",
      size: "L",
      genderFit: "mens",
      quantityOnHand: 8,
      lowStockThreshold: 3,
    },
    { categoryId: toiletries.id, name: "Toiletry pack", unit: "pack", quantityOnHand: 30, lowStockThreshold: 8 },
    { categoryId: blankets.id, name: "Blanket", unit: "blanket", quantityOnHand: 50, lowStockThreshold: 10 },
  ]);

  await db.insert(schema.supportCategories).values([
    { name: "Housing" },
    { name: "Health" },
    { name: "Mental health" },
    { name: "Legal" },
    { name: "Financial" },
    { name: "Family violence" },
    { name: "Drug & alcohol" },
    { name: "Language services" },
  ]);

  console.log("Seeded categories, inventory_items, and support_categories.");
  await client.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
