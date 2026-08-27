import { describe, it, expect, beforeAll } from "vitest";
import express from "express";
import request from "supertest";
import { verifyJwt } from "../verifyJwt.js";
import { requireRole } from "../requireRole.js";
import { signIn, TEST_VOLUNTEER, TEST_ADMIN } from "../../__tests__/helpers.js";

function buildTestApp() {
  const app = express();
  app.get("/protected", verifyJwt, (req, res) => {
    res.json({ ok: true, role: req.auth?.role });
  });
  app.get("/admin-only", verifyJwt, requireRole("admin", "lead"), (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

describe("auth middleware", () => {
  const app = buildTestApp();
  let volunteerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    volunteerToken = await signIn(TEST_VOLUNTEER.email, TEST_VOLUNTEER.password);
    adminToken = await signIn(TEST_ADMIN.email, TEST_ADMIN.password);
  });

  it("rejects a request with no bearer token", async () => {
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
  });

  it("rejects a request with a garbage token", async () => {
    const res = await request(app).get("/protected").set("Authorization", "Bearer not-a-real-jwt");
    expect(res.status).toBe(401);
  });

  it("accepts a valid volunteer token and resolves its role from public.users", async () => {
    const res = await request(app).get("/protected").set("Authorization", `Bearer ${volunteerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("volunteer");
  });

  it("blocks a volunteer from an admin-only route", async () => {
    const res = await request(app).get("/admin-only").set("Authorization", `Bearer ${volunteerToken}`);
    expect(res.status).toBe(403);
  });

  it("allows an admin on an admin-only route", async () => {
    const res = await request(app).get("/admin-only").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});
