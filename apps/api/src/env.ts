import { config } from "dotenv";
import { resolve } from "node:path";

// Env vars live in the repo-root .env (see .env.example), not apps/api/.env.
config({ path: resolve(import.meta.dirname, "../../../.env") });

export const PORT = Number(process.env.PORT ?? 3000);
export const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:5173";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  return value;
}

export const SUPABASE_URL = required("SUPABASE_URL");
export const DATABASE_URL = required("DATABASE_URL");
