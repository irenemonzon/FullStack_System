import type { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { SUPABASE_URL } from "../env.js";
import { client } from "../lib/db.js";

const JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; role: string };
    }
  }
}

// Verifies the Supabase-issued JWT and resolves the caller's role from
// public.users — never from anything the client sends. Attaches
// req.auth for downstream middleware/routes.
export async function verifyJwt(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }
  const token = header.slice("Bearer ".length);

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, JWKS);
    if (!payload.sub) throw new Error("Token missing sub claim");
    userId = payload.sub;
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const [row] = await client`
    select role, active from public.users where id = ${userId}
  `;
  if (!row || !row.active) {
    res.status(403).json({ error: "No active account for this user" });
    return;
  }

  req.auth = { userId, role: row.role };
  next();
}
