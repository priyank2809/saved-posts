import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { db, sqlite } from "../db/client.js";
import { posts, saves } from "../db/schema.js";
import { eq, and, desc } from "drizzle-orm";
import type { Variables } from "../types.js";
import { canAccessCourse } from "../lib/authz.js";
import { decideSave } from "../lib/saveDecision.js";
import { getEnrolledCourseIds } from "./courses.js";

export const postsRoute = new Hono<{ Variables: Variables }>();

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

type PostRow = typeof posts.$inferSelect;

function serialize(post: PostRow, hasSaved: boolean, authorName: string) {
  return {
    id: post.id,
    courseId: post.courseId,
    authorId: post.authorId,
    authorName,
    title: post.title,
    body: post.body,
    savesCount: post.savesCount,
    createdAt: post.createdAt.toISOString(),
    hasSaved,
  };
}

function hydrateHasSaved(userId: string, postIds: string[]): Set<string> {
  if (postIds.length === 0) return new Set();
  const placeholders = postIds.map(() => "?").join(",");
  const rows = sqlite
    .prepare(`SELECT post_id FROM saves WHERE user_id = ? AND active = 1 AND post_id IN (${placeholders})`)
    .all(userId, ...postIds) as { post_id: string }[];
  return new Set(rows.map((r) => r.post_id));
}

function hydrateAuthorNames(authorIds: string[]): Map<string, string> {
  if (authorIds.length === 0) return new Map();
  const uniqueIds = [...new Set(authorIds)];
  const placeholders = uniqueIds.map(() => "?").join(",");
  const rows = sqlite.prepare(`SELECT id, name FROM users WHERE id IN (${placeholders})`).all(...uniqueIds) as {
    id: string;
    name: string;
  }[];
  return new Map(rows.map((r) => [r.id, r.name]));
}

// GET /api/courses/:courseId/posts  paginated feed, newest first
postsRoute.get("/courses/:courseId/posts", zValidator("query", paginationSchema), async (c) => {
  const user = c.get("user");
  const courseId = c.req.param("courseId")!;
  const { page, pageSize } = c.req.valid("query");

  const enrolled = getEnrolledCourseIds(user.id);
  if (!canAccessCourse(user, enrolled, courseId)) {
    return c.json({ error: "forbidden", message: "You are not enrolled in this course." }, 403);
  }

  const rows = db
    .select()
    .from(posts)
    .where(eq(posts.courseId, courseId))
    .orderBy(desc(posts.createdAt), desc(posts.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .all();

  const totalRow = sqlite.prepare(`SELECT COUNT(*) as n FROM posts WHERE course_id = ?`).get(courseId) as { n: number };

  const hasSavedSet = hydrateHasSaved(user.id, rows.map((r) => r.id));
  const authorNames = hydrateAuthorNames(rows.map((r) => r.authorId));

  return c.json({
    posts: rows.map((r) => serialize(r, hasSavedSet.has(r.id), authorNames.get(r.authorId) ?? "Unknown")),
    page,
    pageSize,
    total: totalRow.n,
    hasMore: page * pageSize < totalRow.n,
  });
});

// GET /api/posts/:postId  single post
postsRoute.get("/posts/:postId", async (c) => {
  const user = c.get("user");
  const postId = c.req.param("postId")!;

  const post = db.select().from(posts).where(eq(posts.id, postId)).get();
  if (!post) {
    return c.json({ error: "not_found", message: "Post not found." }, 404);
  }

  const enrolled = getEnrolledCourseIds(user.id);
  if (!canAccessCourse(user, enrolled, post.courseId)) {
    return c.json({ error: "forbidden", message: "You are not enrolled in this course." }, 403);
  }

  const hasSavedSet = hydrateHasSaved(user.id, [post.id]);
  const authorNames = hydrateAuthorNames([post.authorId]);
  return c.json(serialize(post, hasSavedSet.has(post.id), authorNames.get(post.authorId) ?? "Unknown"));
});

// POST /api/posts/:postId/save  idempotent save
postsRoute.post("/posts/:postId/save", async (c) => applySave(c, "save"));
// DELETE /api/posts/:postId/save  idempotent un-save (soft delete)
postsRoute.delete("/posts/:postId/save", async (c) => applySave(c, "unsave"));

async function applySave(c: Context<{ Variables: Variables }>, intent: "save" | "unsave") {
  const user = c.get("user");
  const postId = c.req.param("postId")!;

  const post = db.select().from(posts).where(eq(posts.id, postId)).get();
  if (!post) {
    return c.json({ error: "not_found", message: "Post not found." }, 404);
  }

  const enrolled = getEnrolledCourseIds(user.id);
  if (!canAccessCourse(user, enrolled, post.courseId)) {
    return c.json({ error: "forbidden", message: "You are not enrolled in this course." }, 403);
  }

  const existingRow = db
    .select()
    .from(saves)
    .where(and(eq(saves.userId, user.id), eq(saves.postId, postId)))
    .get();

  const decision = decideSave(existingRow ? { active: existingRow.active } : null, intent);
  const now = new Date();

  const runTxn = sqlite.transaction(() => {
    if (decision.kind === "create") {
      db.insert(saves)
        .values({ id: randomUUID(), userId: user.id, postId, active: true, createdAt: now, updatedAt: now })
        .run();
    } else if (decision.kind === "reactivate" || decision.kind === "deactivate") {
      db.update(saves)
        .set({ active: decision.resultingActive, updatedAt: now })
        .where(and(eq(saves.userId, user.id), eq(saves.postId, postId)))
        .run();
    }

    if (decision.countDelta !== 0) {
      sqlite.prepare(`UPDATE posts SET saves_count = saves_count + ? WHERE id = ?`).run(decision.countDelta, postId);
    }
  });
  runTxn();

  const updatedPost = db.select().from(posts).where(eq(posts.id, postId)).get()!;
  const authorNames = hydrateAuthorNames([updatedPost.authorId]);
  return c.json(serialize(updatedPost, decision.resultingActive, authorNames.get(updatedPost.authorId) ?? "Unknown"));
}

// DELETE /api/posts/:postId  moderator only hard removal
postsRoute.delete("/posts/:postId", async (c) => {
  const user = c.get("user");
  if (user.role !== "moderator") {
    return c.json({ error: "forbidden", message: "Only moderators can remove posts." }, 403);
  }
  const postId = c.req.param("postId")!;
  const post = db.select().from(posts).where(eq(posts.id, postId)).get();
  if (!post) {
    return c.json({ error: "not_found", message: "Post not found." }, 404);
  }
  db.delete(saves).where(eq(saves.postId, postId)).run();
  db.delete(posts).where(eq(posts.id, postId)).run();
  return c.json({ ok: true });
});
