import { ApiError, type Course, type PagedResponse, type Post } from "./types";
import type { StubUser } from "../context/CurrentUserContext";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, user: StubUser, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-user-id": user.id,
      "x-user-role": user.role,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  getCourses: (user: StubUser) => request<{ courses: Course[] }>("/api/courses", user),

  getFeed: (user: StubUser, courseId: string, page: number, pageSize: number) =>
    request<PagedResponse<Post>>(`/api/courses/${courseId}/posts?page=${page}&pageSize=${pageSize}`, user),

  getSaved: (user: StubUser, page: number, pageSize: number) =>
    request<PagedResponse<Post>>(`/api/saved?page=${page}&pageSize=${pageSize}`, user),

  save: (user: StubUser, postId: string) => request<Post>(`/api/posts/${postId}/save`, user, { method: "POST" }),

  unsave: (user: StubUser, postId: string) => request<Post>(`/api/posts/${postId}/save`, user, { method: "DELETE" }),

  removePost: (user: StubUser, postId: string) =>
    request<{ ok: true }>(`/api/posts/${postId}`, user, { method: "DELETE" }),
};
