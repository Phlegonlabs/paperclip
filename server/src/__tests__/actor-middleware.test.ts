import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { actorMiddleware } from "../middleware/auth.js";

function createApp() {
  const app = express();
  app.use(actorMiddleware({} as any, { deploymentMode: "local_trusted" }));
  app.get("/api/actor", (req, res) => {
    res.json(req.actor);
  });
  return app;
}

describe("actor middleware local_trusted fallback", () => {
  it("keeps implicit board access for local requests without auth headers", async () => {
    const app = createApp();
    const res = await request(app).get("/api/actor");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      type: "board",
      userId: "local-board",
      isInstanceAdmin: true,
      source: "local_implicit",
    });
  });

  it("does not fall back to implicit board when a run id header is present without bearer auth", async () => {
    const app = createApp();
    const res = await request(app)
      .get("/api/actor")
      .set("X-Paperclip-Run-Id", "run-123");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      type: "none",
      source: "none",
      runId: "run-123",
    });
  });

  it("does not fall back to implicit board when another auth scheme is present", async () => {
    const app = createApp();
    const res = await request(app)
      .get("/api/actor")
      .set("Authorization", "Basic abc123");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      type: "none",
      source: "none",
    });
  });
});
