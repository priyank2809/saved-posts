import type { Context, Next } from "hono";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { AuthedUser } from "../lib/authz.js";

export async function authMiddleware(c: Context, next: Next) {
  const userId = c.req.header("x-user-id");
  const role = c.req.header("x-user-role");

  if (!userId || !role || (role !== "student" && role !== "moderator")) {
    return c.json({ error: "unauthorized", message: "Missing or invalid auth headers." }, 401);
  }

  const row = db.select().from(users).where(eq(users.id, userId)).get();
  if (!row || row.role !== role) {
    return c.json({ error: "unauthorized", message: "Unknown user." }, 401);
  }

  const authedUser: AuthedUser = { id: row.id, role: row.role };
  c.set("user", authedUser);
  return next();
}
