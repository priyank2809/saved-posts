import { describe, it, expect } from "vitest";
import { canAccessCourse } from "../src/lib/authz.js";

describe("canAccessCourse (pure, no DB)", () => {
  it("allows a student enrolled in the course", () => {
    expect(canAccessCourse({ id: "u1", role: "student" }, new Set(["c1"]), "c1")).toBe(true);
  });

  it("blocks a student not enrolled in the course", () => {
    expect(canAccessCourse({ id: "u1", role: "student" }, new Set(["c1"]), "c2")).toBe(false);
  });

  it("allows a moderator regardless of enrollment", () => {
    expect(canAccessCourse({ id: "u2", role: "moderator" }, new Set(), "c1")).toBe(true);
  });
});
