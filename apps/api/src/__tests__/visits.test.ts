import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { client, withAuth, schema } from "../lib/db.js";
import { signIn, TEST_VOLUNTEER } from "./helpers.js";

const { guests } = schema;

const app = createApp();

describe("visits", () => {
  let volunteerToken: string;
  let guestId: string;

  beforeAll(async () => {
    volunteerToken = await signIn(TEST_VOLUNTEER.email, TEST_VOLUNTEER.password);
    const [v] = await client`select id from public.users where email = ${TEST_VOLUNTEER.email}`;
    const [guest] = await withAuth({ userId: v.id, role: "volunteer" }, (tx) =>
      tx.insert(guests).values({ displayName: "Visits Test Guest", gender: "prefer_not_to_say" }).returning(),
    );
    guestId = guest.id;
  });

  afterAll(async () => {
    await client`delete from visits where guest_id = ${guestId}`;
    await client`delete from guests where id = ${guestId}`;
  });

  it("rejects creating a visit with no guestId", async () => {
    const res = await request(app).post("/api/visits").set("Authorization", `Bearer ${volunteerToken}`).send({});
    expect(res.status).toBe(400);
  });

  it("starts a visit, reads it back with services, and marks it finished", async () => {
    const createRes = await request(app)
      .post("/api/visits")
      .set("Authorization", `Bearer ${volunteerToken}`)
      .send({ guestId });
    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe("open");
    const visitId: string = createRes.body.id;

    const getRes = await request(app).get(`/api/visits/${visitId}`).set("Authorization", `Bearer ${volunteerToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.services).toEqual([]);

    const patchRes = await request(app)
      .patch(`/api/visits/${visitId}`)
      .set("Authorization", `Bearer ${volunteerToken}`)
      .send({ status: "finished" });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.status).toBe("finished");
  });
});
