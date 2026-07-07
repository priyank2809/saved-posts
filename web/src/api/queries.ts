import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { api } from "./client";
import type { PagedResponse, Post } from "./types";
import { useCurrentUser } from "../context/CurrentUserContext";

// --- Query-key factory -------------------------------------------------------
export const postKeys = {
  all: ["posts"] as const,
  courses: (userId: string) => ["courses", userId] as const,
  feed: (userId: string, courseId: string, page: number, pageSize: number) =>
    [...postKeys.all, "feed", userId, courseId, page, pageSize] as const,
  saved: (userId: string, page: number, pageSize: number) =>
    [...postKeys.all, "saved", userId, page, pageSize] as const,
};

export function useCourses() {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: postKeys.courses(user.id),
    queryFn: () => api.getCourses(user),
  });
}

export function useFeed(courseId: string | undefined, page: number, pageSize = 5) {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: postKeys.feed(user.id, courseId ?? "", page, pageSize),
    queryFn: () => api.getFeed(user, courseId!, page, pageSize),
    enabled: !!courseId,
    placeholderData: (prev) => prev,
  });
}

export function useSavedPosts(page: number, pageSize = 5) {
  const { user } = useCurrentUser();
  return useQuery({
    queryKey: postKeys.saved(user.id, page, pageSize),
    queryFn: () => api.getSaved(user, page, pageSize),
    placeholderData: (prev) => prev,
  });
}

type SaveMutationVars = { postId: string; intent: "save" | "unsave" };

export function useSaveMutation() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const currentUserPostQueries = { queryKey: postKeys.all, predicate: (q: { queryKey: readonly unknown[] }) => q.queryKey[2] === user.id };

  return useMutation({
    mutationFn: ({ postId, intent }: SaveMutationVars) =>
      intent === "save" ? api.save(user, postId) : api.unsave(user, postId),

    onMutate: async ({ postId, intent }) => {
      await queryClient.cancelQueries(currentUserPostQueries);

      const previous = queryClient.getQueriesData<PagedResponse<Post>>(currentUserPostQueries);

      const applyOptimistic = (page: PagedResponse<Post> | undefined) => {
        if (!page) return page;
        return {
          ...page,
          posts: page.posts.map((p) =>
            p.id === postId
              ? { ...p, hasSaved: intent === "save", savesCount: p.savesCount + (intent === "save" ? 1 : p.hasSaved ? -1 : 0) }
              : p
          ),
        };
      };

      queryClient.setQueriesData<PagedResponse<Post>>(currentUserPostQueries, applyOptimistic);

      return { previous };
    },

    onError: (_err, _vars, context) => {
      context?.previous.forEach(([key, data]) => {
        queryClient.setQueryData(key as QueryKey, data);
      });
    },

    onSettled: () => {
      queryClient.invalidateQueries(currentUserPostQueries);
    },
  });
}

export function useRemovePostMutation() {
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => api.removePost(user, postId),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}