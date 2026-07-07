import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { authMiddleware } from "./middleware/auth.js";
import { coursesRoute } from "./routes/courses.js";
import { postsRoute } from "./routes/posts.js";
import { savedRoute } from "./routes/saved.js";
import type { Variables } from "./types.js";

const app = new Hono<{ Variables: Variables }>();

const allowedOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  "*",
  cors({
    origin: (origin) => (origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]),
  })
);

app.get("/health", (c) => c.json({ ok: true }));

app.use("/api/*", authMiddleware);
app.route("/api/courses", coursesRoute);
app.route("/api", postsRoute);
app.route("/api/saved", savedRoute);

export default app;

if (process.argv[1] && (process.argv[1].endsWith("index.ts") || process.argv[1].endsWith("index.js"))) {
  const port = Number(process.env.PORT ?? 4000);
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`Saved Posts API listening on http://localhost:${info.port}`);
  });
}