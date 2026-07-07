import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

// --- Users -----------------------------------------------------------------
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role", { enum: ["student", "moderator"] }).notNull(),
});

// --- Courses -----------------------------------------------------------------
export const courses = sqliteTable("courses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

// --- Enrollments ----------------------------
export const enrollments = sqliteTable(
  "enrollments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    courseId: text("course_id").notNull().references(() => courses.id),
  },
  (t) => ({
    userCourseUnique: uniqueIndex("enrollments_user_course_unique").on(t.userId, t.courseId),
  })
);

// --- Posts -------------------------------------------------------------------
export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull().references(() => courses.id),
  authorId: text("author_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  savesCount: integer("saves_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

// --- Saves --------------------------------------------------------
export const saves = sqliteTable(
  "saves",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    postId: text("post_id").notNull().references(() => posts.id),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => ({
    userPostUnique: uniqueIndex("saves_user_post_unique").on(t.userId, t.postId),
  })
);
