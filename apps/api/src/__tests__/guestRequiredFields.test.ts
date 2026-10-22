import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { client } from "../lib/db.js";
import { signIn, TEST_VOLUNTEER } from "./helpers.js";

const app = createApp();

describe("guest required fields", () => {
  let token: string;
  // Unique per run so real guests (or a previous failed run) can't match.
  const suffix = Math.random().toString(36).slice(2, 8);
  const name = `Required Test ${suffix}`;
  const createdIds: string[] = [];

  function register(body: object) {
    return request(app)
      .post("/api/guests?allowDuplicate=true")
      .set("Authorization", `Bearer ${token}`)
      .send({ gender: "prefer_not_to_say", ...body });
  }

  function edit(id: string, body: object) {
    return request(app).patch(`/api/guests/${id}`).set("Authorization", `Bearer ${token}`).send(body);
  }

  async function countByName() {
    const [row] = await client`select count(*)::int as n from guests where display_name = ${name}`;
    return row.n as number;
  }

  beforeAll(async () => {
    token = await signIn(TEST_VOLUNTEER.email, TEST_VOLUNTEER.password);
  });

  afterAll(async () => {
    await client`delete from guests where id = any(${createdIds})`;
  });

  it("rejects a registration with a missing, empty or blank postcode", async () => {
    expect((await register({ displayName: name })).status).toBe(400);
    expect((await register({ displayName: name, postcode: "" })).status).toBe(400);
    expect((await register({ displayName: name, postcode: "   " })).status).toBe(400);
    expect(await countByName()).toBe(0);
  });

  it("rejects a name that's only spaces", async () => {
    expect((await register({ displayName: "   ", postcode: "3012" })).status).toBe(400);
  });

  it("registers a guest with name, gender and postcode", async () => {
    const res = await register({ displayName: name, postcode: "3012" });
    expect(res.status).toBe(201);
    expect(res.body.postcode).toBe("3012");
    createdIds.push(res.body.id);
  });

  it("won't clear the postcode on edit", async () => {
    const [id] = createdIds;
    expect((await edit(id, { postcode: null })).status).toBe(400);
    expect((await edit(id, { postcode: "" })).status).toBe(400);

    const res = await request(app).get(`/api/guests/${id}`).set("Authorization", `Bearer ${token}`);
    expect(res.body.postcode).toBe("3012");
  });

  it("edits other fields without re-sending the postcode", async () => {
    const res = await edit(createdIds[0], { notes: "Edited notes" });
    expect(res.status).toBe(200);
    expect(res.body.postcode).toBe("3012");
  });
});
