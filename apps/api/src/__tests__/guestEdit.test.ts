import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { client } from "../lib/db.js";
import { signIn, TEST_VOLUNTEER } from "./helpers.js";

const app = createApp();

describe("guest editing", () => {
  let token: string;
  // Unique per run so real guests (or a previous failed run) can't match.
  const suffix = Math.random().toString(36).slice(2, 8);
  const phone = `04${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
  let guestA: string;
  let guestB: string;

  async function register(body: object) {
    const res = await request(app)
      .post("/api/guests?allowDuplicate=true")
      .set("Authorization", `Bearer ${token}`)
      .send({ gender: "prefer_not_to_say", ...body });
    expect(res.status).toBe(201);
    return res.body.id as string;
  }

  function edit(id: string, body: object) {
    return request(app).patch(`/api/guests/${id}`).set("Authorization", `Bearer ${token}`).send(body);
  }

  beforeAll(async () => {
    token = await signIn(TEST_VOLUNTEER.email, TEST_VOLUNTEER.password);
    guestA = await register({ displayName: `Edit Test A ${suffix}`, postcode: "3021", phone });
    guestB = await register({ displayName: `Edit Test B ${suffix}`, postcode: "3021" });
  });

  afterAll(async () => {
    await client`delete from guests where id = any(${[guestA, guestB]})`;
  });

  it("saves a change and reports no shared phone", async () => {
    const res = await edit(guestB, { postcode: "3000" });
    expect(res.status).toBe(200);
    expect(res.body.postcode).toBe("3000");
    expect(res.body.phoneSharedWith).toEqual([]);
  });

  it("saves a phone another guest has, ignoring spaces, and lists that guest", async () => {
    const spaced = `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
    const res = await edit(guestB, { phone: spaced });
    expect(res.status).toBe(200);
    expect(res.body.phone).toBe(spaced);
    expect(res.body.phoneSharedWith.map((g: { id: string }) => g.id)).toEqual([guestA]);
  });

  it("doesn't report an already-shared phone when something else is edited", async () => {
    const res = await edit(guestB, { notes: "Edited notes" });
    expect(res.status).toBe(200);
    expect(res.body.phoneSharedWith).toEqual([]);
  });

  it("clears an optional field sent as null", async () => {
    const res = await edit(guestB, { phone: null });
    expect(res.status).toBe(200);
    expect(res.body.phone).toBeNull();
  });

  it("rejects an empty name or invalid birth date and changes nothing", async () => {
    expect((await edit(guestB, { displayName: "" })).status).toBe(400);
    expect((await edit(guestB, { birthDate: "1985-02-30" })).status).toBe(400);

    const res = await request(app).get(`/api/guests/${guestB}`).set("Authorization", `Bearer ${token}`);
    expect(res.body.displayName).toBe(`Edit Test B ${suffix}`);
    expect(res.body.birthDate).toBeNull();
  });
});
