import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { resolve } from "node:path";

// drizzle-kit runs this file transpiled to CJS, so `import.meta.dirname` is
// unavailable — resolve relative to cwd instead (drizzle-kit commands run
// from the db/ package directory via `pnpm --filter db ...`).
config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../.env") });

// `generate` only diffs schema.ts against prior migrations and doesn't need
// a live connection, so DATABASE_URL is optional for it. `push`/`migrate`/
// `studio` do need it and will fail with a clear connection error if unset.
export default defineConfig({
  schema: "./schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
