import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sqlite } from "../db/client.js";
import type { Variables } from "../types.js";

export const savedRoute = new Hono<{ Variables: Variables }>();

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});

interface SavedRow {
  id: string;
  course_id: string;
  author_id: string;
  author_name: string;
  title: string;
  body: string;
  saves_count: number;
  created_at: number;
  saved_at: number;
}

savedRoute.get("/", zValidator("query", paginationSchema), (c) => {
  const user = c.get("user");
  const { page, pageSize } = c.req.valid("query");

  const rows = sqlite
    .prepare(
      `SELECT p.id, p.course_id, p.author_id, u.name as author_name, p.title, p.body, p.saves_count, p.created_at, s.updated_at as saved_at
       FROM saves s
       JOIN posts p ON p.id = s.post_id
       JOIN users u ON u.id = p.author_id
       WHERE s.user_id = ? AND s.active = 1
       ORDER BY s.updated_at DESC, p.id DESC
       LIMIT ? OFFSET ?`
    )
    .all(user.id, pageSize, (page - 1) * pageSize) as SavedRow[];

  const totalRow = sqlite
    .prepare(`SELECT COUNT(*) as n FROM saves WHERE user_id = ? AND active = 1`)
    .get(user.id) as { n: number };

  return c.json({
    posts: rows.map((r) => ({
      id: r.id,
      courseId: r.course_id,
      authorId: r.author_id,
      authorName: r.author_name,
      title: r.title,
      body: r.body,
      savesCount: r.saves_count,
      createdAt: new Date(r.created_at).toISOString(),
      savedAt: new Date(r.saved_at).toISOString(),
      hasSaved: true,
    })),
    page,
    pageSize,
    total: totalRow.n,
    hasMore: page * pageSize < totalRow.n,
  });
});
