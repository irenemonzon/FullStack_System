import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  integer,
  jsonb,
  bigserial,
} from "drizzle-orm/pg-core";

// ---------- Enums ----------

export const userRoleEnum = pgEnum("user_role", ["volunteer", "admin", "lead"]);

export const guestGenderEnum = pgEnum("guest_gender", [
  "woman",
  "man",
  "non_binary",
  "prefer_not_to_say",
]);

export const visitStatusEnum = pgEnum("visit_status", ["open", "finished"]);

// Shared by `categories.station` (kitchen | material_aid only) and
// `services.station` (kitchen | material_aid | information).
export const stationEnum = pgEnum("station", ["kitchen", "material_aid", "information"]);

export const genderFitEnum = pgEnum("gender_fit", ["mens", "womens", "unisex", "kids"]);

export const auditActionEnum = pgEnum("audit_action", ["insert", "update", "delete"]);

// ---------- Tables ----------

// Mirrors `auth.users.id` (Supabase Auth) — id is not auto-generated here,
// it's set to match the corresponding auth user when an admin provisions
// the account (see plan_project.md Sprint 2 "Account provisioning").
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default("volunteer"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const guests = pgTable("guests", {
  id: uuid("id").primaryKey().defaultRandom(),
  displayName: text("display_name").notNull(),
  gender: guestGenderEnum("gender").notNull(),
  birthDate: date("birth_date"),
  postcode: text("postcode"),
  // Stage 1 addition (not in the original scope doc): used for
  // returning-guest matching/deduplication alongside name + birth date.
  phone: text("phone"),
  preferredLanguage: text("preferred_language"),
  dietary: text("dietary"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
});

export const visits = pgTable("visits", {
  id: uuid("id").primaryKey().defaultRandom(),
  guestId: uuid("guest_id")
    .notNull()
    .references(() => guests.id),
  volunteerId: uuid("volunteer_id").references(() => users.id),
  visitedAt: timestamp("visited_at", { withTimezone: true }).notNull().defaultNow(),
  status: visitStatusEnum("status").notNull().default("open"),
  notes: text("notes"),
});

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  station: stationEnum("station").notNull(),
  name: text("name").notNull(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id),
  name: text("name").notNull(),
  size: text("size"),
  genderFit: genderFitEnum("gender_fit"),
  unit: text("unit").notNull(),
  perGuestLimit: integer("per_guest_limit"),
  active: boolean("active").notNull().default(true),
  // Stage 1 mock-stock columns (not in the original scope doc, which puts
  // real stock tracking in Stage 2). See plan_project.md Sprint 4.
  quantityOnHand: integer("quantity_on_hand"),
  lowStockThreshold: integer("low_stock_threshold"),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  visitId: uuid("visit_id")
    .notNull()
    .references(() => visits.id),
  station: stationEnum("station").notNull(),
  inventoryItemId: uuid("inventory_item_id").references(() => inventoryItems.id),
  quantity: integer("quantity"),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
});

export const supportCategories = pgTable("support_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
});

export const serviceSupports = pgTable("service_supports", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceId: uuid("service_id")
    .notNull()
    .references(() => services.id),
  supportCategoryId: uuid("support_category_id")
    .notNull()
    .references(() => supportCategories.id),
  note: text("note"),
});

// Written only by the Postgres audit trigger (Sprint 2) — never by app code.
export const auditLog = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tableName: text("table_name").notNull(),
  rowId: uuid("row_id"),
  action: auditActionEnum("action").notNull(),
  actorId: uuid("actor_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});
