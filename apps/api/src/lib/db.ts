import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import * as schema from "db/schema.js";
import { DATABASE_URL } from "../env.js";

// Connects as the `postgres` (owner) role. Only use `db` directly for
// pre-auth/system operations — see withAuth below, which scopes each
// transaction to the `authenticated` role so RLS is actually enforced.
export const client = postgres(DATABASE_URL);
export const db = drizzle(client, { schema });

// `role` is carried here only so callers can pass req.auth straight
// through — withAuth itself never trusts it. RLS re-derives the real
// role from public.users via auth.uid() on every query, so even a
// caller passing the wrong role can't escalate privileges through here.
export type AuthContext = { userId: string; role: string } | null;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Runs `fn` inside a transaction scoped to the given auth context: sets
// request.jwt.claims (so auth.uid() resolves) and switches the session
// role to `authenticated` (so RLS policies apply, since `postgres` is
// the table owner and would otherwise bypass RLS entirely). Pass `null`
// to run as the raw owner role (only for pre-auth/system operations).
export async function withAuth<T>(auth: AuthContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx): Promise<T> => {
    if (auth) {
      const claims = JSON.stringify({ sub: auth.userId, role: "authenticated" });
      await tx.execute(sql`select set_config('request.jwt.claims', ${claims}, true)`);
      await tx.execute(sql`set local role authenticated`);
    }
    return fn(tx);
  });
}

export { schema };
