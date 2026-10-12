import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { client } from "../lib/db.js";
import { signIn, TEST_VOLUNTEER } from "./helpers.js";

const app = createApp();

describe("guest registration duplicate check", () => {
  let token: string;
  // Unique per run so real guests (or a previous failed run) can't match.
  const suffix = Math.random().toString(36).slice(2, 8);
  const name = `Dup Test ${suffix}`;
  const phone = `04${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
  const createdIds: string[] = [];

  function register(body: object, allowDuplicate = false) {
    return request(app)
      .post(`/api/guests${allowDuplicate ? "?allowDuplicate=true" : ""}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ gender: "prefer_not_to_say", ...body });
  }

  beforeAll(async () => {
    token = await signIn(TEST_VOLUNTEER.email, TEST_VOLUNTEER.password);
    const res = await register({ displayName: name, birthDate: "1985-09-05", postcode: "3021", phone });
    expect(res.status).toBe(201);
    createdIds.push(res.body.id);
  });

  afterAll(async () => {
    await client`delete from guests where id = any(${createdIds})`;
  });

  it("flags the same phone number, ignoring spaces", async () => {
    const spaced = `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
    const res = await register({ displayName: `Someone Else ${suffix}`, phone: spaced });
    expect(res.status).toBe(409);
    expect(res.body.duplicates).toHaveLength(1);
    expect(res.body.duplicates[0].id).toBe(createdIds[0]);
    expect(res.body.duplicates[0].matchedOn).toEqual(["phone"]);
  });

  it("flags the same name (case/spacing-insensitive) plus birth date", async () => {
    const res = await register({ displayName: `  dup  test ${suffix.toUpperCase()} `, birthDate: "1985-09-05" });
    expect(res.status).toBe(409);
    expect(res.body.duplicates[0].matchedOn).toEqual(["name", "birthDate"]);
  });

  it("flags the same name plus postcode", async () => {
    const res = await register({ displayName: name, postcode: " 3021 " });
    expect(res.status).toBe(409);
    expect(res.body.duplicates[0].matchedOn).toEqual(["name", "postcode"]);
  });

  it("does not flag a matching name on its own", async () => {
    const res = await register({ displayName: name, birthDate: "1990-01-01", postcode: "3000" });
    expect(res.status).toBe(201);
    createdIds.push(res.body.id);
  });

  it("registers anyway when allowDuplicate=true", async () => {
    const res = await register({ displayName: name, phone }, true);
    expect(res.status).toBe(201);
    createdIds.push(res.body.id);
  });
});
