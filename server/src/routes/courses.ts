import { Hono } from "hono";
import { db, sqlite } from "../db/client.js";
import { courses, enrollments } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { Variables } from "../types.js";

export const coursesRoute = new Hono<{ Variables: Variables }>();

coursesRoute.get("/", (c) => {
  const user = c.get("user");

  if (user.role === "moderator") {
    const all = db.select().from(courses).all();
    return c.json({ courses: all });
  }

  const rows = sqlite
    .prepare(
      `SELECT c.id, c.name FROM courses c
       JOIN enrollments e ON e.course_id = c.id
       WHERE e.user_id = ?`
    )
    .all(user.id) as { id: string; name: string }[];

  return c.json({ courses: rows });
});

export function getEnrolledCourseIds(userId: string): Set<string> {
  const rows = db.select({ courseId: enrollments.courseId }).from(enrollments).where(eq(enrollments.userId, userId)).all();
  return new Set(rows.map((r) => r.courseId));
}
