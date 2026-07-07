import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";

const TEST_DB = "./data/test.db";
process.env.DATABASE_PATH = TEST_DB;

let app: import("hono").Hono<any>;
let seeded: Awaited<ReturnType<typeof import("../src/db/seed.js")["runSeed"]>>;

beforeAll(async () => {
  fs.mkdirSync("./data", { recursive: true });
  for (const suffix of ["", "-wal", "-shm"]) {
    if (fs.existsSync(TEST_DB + suffix)) fs.rmSync(TEST_DB + suffix);
  }

  const { runMigration } = await import("../src/db/migrate.js");
  runMigration();
  const { runSeed } = await import("../src/db/seed.js");
  seeded = runSeed();

  const mod = await import("../src/index.js");
  app = (mod as any).default ?? (mod as any).app;
});

function headersFor(userId: string, role: "student" | "moderator") {
  return { "x-user-id": userId, "x-user-role": role };
}

describe("API — auth boundaries", () => {
  it("401s an unauthenticated request", async () => {
    const res = await app.request("/api/courses");
    expect(res.status).toBe(401);
  });

  it("401s an unknown user id", async () => {
    const res = await app.request("/api/courses", { headers: headersFor("nope", "student") });
    expect(res.status).toBe(401);
  });

  it("404s a post that doesn't exist", async () => {
    const res = await app.request("/api/posts/does-not-exist", {
      headers: headersFor(seeded.alice.id, "student"),
    });
    expect(res.status).toBe(404);
  });

  it("403s a student reading a course they are not enrolled in", async () => {
    const res = await app.request(`/api/courses/${seeded.cs101.id}/posts`, {
      headers: headersFor(seeded.carla.id, "student"),
    });
    expect(res.status).toBe(403);
  });

  it("403s a student saving a post in a course they are not enrolled in", async () => {
    const res = await app.request("/api/posts/p_1/save", {
      method: "POST",
      headers: headersFor(seeded.carla.id, "student"),
    });
    expect(res.status).toBe(403);
  });

  it("a moderator CAN read a course they are not enrolled in", async () => {
    const res = await app.request(`/api/courses/${seeded.web201.id}/posts`, {
      headers: headersFor(seeded.mo.id, "moderator"),
    });
    expect(res.status).toBe(200);
  });

  it("never returns another user's saved list — /api/saved is always scoped to the caller", async () => {
    const aliceRes = await app.request("/api/saved", { headers: headersFor(seeded.alice.id, "student") });
    const bobRes = await app.request("/api/saved", { headers: headersFor(seeded.bob.id, "student") });
    const alice = (await aliceRes.json()) as any;
    const bob = (await bobRes.json()) as any;
    const aliceIds = new Set(alice.posts.map((p: any) => p.id));
    const bobIds = new Set(bob.posts.map((p: any) => p.id));
    expect(aliceIds.has("p_1")).toBe(false);
    expect(bobIds.has("p_2")).toBe(false);
  });
});

describe("API — happy path", () => {
  it("feeds newest-first and hydrates hasSaved/savesCount", async () => {
    const res = await app.request(`/api/courses/${seeded.cs101.id}/posts?page=1&pageSize=10`, {
      headers: headersFor(seeded.bob.id, "student"),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    const createdDates = body.posts.map((p: any) => new Date(p.createdAt).getTime());
    expect([...createdDates]).toEqual([...createdDates].sort((a, b) => b - a));
    const p4 = body.posts.find((p: any) => p.id === "p_4");
    expect(p4.hasSaved).toBe(true);
    expect(p4.savesCount).toBeGreaterThanOrEqual(2);
  });

  it("save is idempotent: saving twice does not double the count", async () => {
    const first = await app.request("/api/posts/p_3/save", {
      method: "POST",
      headers: headersFor(seeded.bob.id, "student"),
    });
    const firstBody = (await first.json()) as any;
    const second = await app.request("/api/posts/p_3/save", {
      method: "POST",
      headers: headersFor(seeded.bob.id, "student"),
    });
    const secondBody = (await second.json()) as any;
    expect(firstBody.savesCount).toBe(secondBody.savesCount);
    expect(secondBody.hasSaved).toBe(true);
  });

  it("un-save then re-save reactivates rather than duplicating (savesCount returns to the same value)", async () => {
    const before = (await (
      await app.request(`/api/posts/p_5`, { headers: headersFor(seeded.bob.id, "student") })
    ).json()) as any;

    await app.request("/api/posts/p_5/save", { method: "POST", headers: headersFor(seeded.bob.id, "student") });
    const afterSave = (await (
      await app.request(`/api/posts/p_5`, { headers: headersFor(seeded.bob.id, "student") })
    ).json()) as any;
    expect(afterSave.savesCount).toBe(before.savesCount + 1);

    await app.request("/api/posts/p_5/save", { method: "DELETE", headers: headersFor(seeded.bob.id, "student") });
    const afterUnsave = (await (
      await app.request(`/api/posts/p_5`, { headers: headersFor(seeded.bob.id, "student") })
    ).json()) as any;
    expect(afterUnsave.savesCount).toBe(before.savesCount);
    expect(afterUnsave.hasSaved).toBe(false);

    await app.request("/api/posts/p_5/save", { method: "POST", headers: headersFor(seeded.bob.id, "student") });
    const afterResave = (await (
      await app.request(`/api/posts/p_5`, { headers: headersFor(seeded.bob.id, "student") })
    ).json()) as any;
    expect(afterResave.savesCount).toBe(before.savesCount + 1);
    expect(afterResave.hasSaved).toBe(true);
  });

  it("saved list is most-recently-saved first", async () => {
    const res = await app.request("/api/saved", { headers: headersFor(seeded.bob.id, "student") });
    const body = (await res.json()) as any;
    const savedTimes = body.posts.map((p: any) => new Date(p.savedAt).getTime());
    expect([...savedTimes]).toEqual([...savedTimes].sort((a: number, b: number) => b - a));
  });
});
