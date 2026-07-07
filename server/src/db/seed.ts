import { randomUUID } from "node:crypto";
import { sqlite, db } from "./client.js";
import { users, courses, enrollments, posts, saves } from "./schema.js";

export function runSeed() {
  sqlite.exec(`
    DELETE FROM saves;
    DELETE FROM posts;
    DELETE FROM enrollments;
    DELETE FROM courses;
    DELETE FROM users;
  `);

  const now = Date.now();
  const minutesAgo = (m: number) => new Date(now - m * 60_000);

  // --- Users -------------------------------------------------------------
  const alice = { id: "u_alice", name: "Alice Chen", role: "student" as const };
  const bob = { id: "u_bob", name: "Bob Singh", role: "student" as const };
  const carla = { id: "u_carla", name: "Carla Diaz", role: "student" as const };
  const mo = { id: "u_mo", name: "Mo Reyes", role: "moderator" as const };

  db.insert(users).values([alice, bob, carla, mo]).run();

  // --- Courses -------------------------------------------------------------
  const cs101 = { id: "c_cs101", name: "CS101: Intro to Programming" };
  const web201 = { id: "c_web201", name: "WEB201: Full-Stack Web Development" };

  db.insert(courses).values([cs101, web201]).run();

  // --- Enrollments -----------------------------------------------------------
  db.insert(enrollments).values([
    { id: randomUUID(), userId: alice.id, courseId: cs101.id },
    { id: randomUUID(), userId: alice.id, courseId: web201.id },
    { id: randomUUID(), userId: bob.id, courseId: cs101.id },
  ]).run();

  // --- Posts -------------------------------------------------------------
  const postSeeds = [
    { id: "p_1", courseId: cs101.id, authorId: alice.id, title: "Welcome to CS101!", body: "Kicking things off — introduce yourself below.", minsAgo: 600 },
    { id: "p_2", courseId: cs101.id, authorId: bob.id, title: "Struggling with recursion", body: "Any good mental models for base cases?", minsAgo: 480 },
    { id: "p_3", courseId: cs101.id, authorId: alice.id, title: "Office hours moved", body: "Thursday office hours are now 3-4pm.", minsAgo: 300 },
    { id: "p_4", courseId: cs101.id, authorId: bob.id, title: "Big-O cheat sheet", body: "Made a quick cheat sheet for common complexities.", minsAgo: 120 },
    { id: "p_5", courseId: cs101.id, authorId: alice.id, title: "Assignment 2 clarification", body: "The edge case for empty input is intentional.", minsAgo: 30 },
    { id: "p_6", courseId: web201.id, authorId: alice.id, title: "CORS finally clicked for me", body: "Writing up notes on preflight requests.", minsAgo: 200 },
    { id: "p_7", courseId: web201.id, authorId: mo.id, title: "Reminder: project proposals due Friday", body: "Submit via the usual form.", minsAgo: 90 },
    { id: "p_8", courseId: web201.id, authorId: alice.id, title: "Anyone using React Query?", body: "Curious how people are structuring query keys.", minsAgo: 10 },
  ];

  db.insert(posts).values(
    postSeeds.map((p) => ({
      id: p.id,
      courseId: p.courseId,
      authorId: p.authorId,
      title: p.title,
      body: p.body,
      savesCount: 0,
      createdAt: minutesAgo(p.minsAgo),
    }))
  ).run();

  function seedSave(userId: string, postId: string, minsAgo: number) {
    db.insert(saves)
      .values({ id: randomUUID(), userId, postId, active: true, createdAt: minutesAgo(minsAgo), updatedAt: minutesAgo(minsAgo) })
      .run();
    sqlite.prepare(`UPDATE posts SET saves_count = saves_count + 1 WHERE id = ?`).run(postId);
  }

  seedSave(alice.id, "p_2", 400);
  seedSave(alice.id, "p_4", 100);
  seedSave(bob.id, "p_1", 500);
  seedSave(bob.id, "p_4", 90);

  return { alice, bob, carla, mo, cs101, web201 };
}

if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  const { alice, bob, carla, mo } = runSeed();
  console.log("Seed complete.");
  console.log("Try these headers when calling the API:");
  console.log(`  x-user-id: ${alice.id}  x-user-role: student   (enrolled in CS101 + WEB201)`);
  console.log(`  x-user-id: ${bob.id}    x-user-role: student   (enrolled in CS101 only)`);
  console.log(`  x-user-id: ${carla.id}  x-user-role: student   (enrolled in nothing -> 403 case)`);
  console.log(`  x-user-id: ${mo.id}     x-user-role: moderator (sees all courses)`);
}
