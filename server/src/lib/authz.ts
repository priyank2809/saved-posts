export type Role = "student" | "moderator";

export interface AuthedUser {
  id: string;
  role: Role;
}

export function canAccessCourse(user: AuthedUser, enrolledCourseIds: Set<string>, postCourseId: string): boolean {
  if (user.role === "moderator") return true;
  return enrolledCourseIds.has(postCourseId);
}
