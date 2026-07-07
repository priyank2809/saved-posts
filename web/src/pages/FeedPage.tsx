import { useEffect, useState } from "react";
import { useCourses, useFeed, useSaveMutation, useRemovePostMutation } from "../api/queries";
import { PostCard } from "../components/PostCard";
import { EmptyState } from "../components/EmptyState";
import { Pagination } from "../components/Pagination";
import { PostListSkeleton } from "../components/PostListSkeleton";
import { ErrorBanner } from "../components/ErrorBanner";
import { CoursePicker } from "../components/CoursePicker";
import { useI18n } from "../i18n/I18nProvider";
import { useCurrentUser } from "../context/CurrentUserContext";
import type { Post } from "../api/types";

const PAGE_SIZE = 5;

export function FeedPage() {
  const { t } = useI18n();
  const { user } = useCurrentUser();
  const coursesQuery = useCourses();
  const [courseId, setCourseId] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const first = coursesQuery.data?.courses[0]?.id;
    setCourseId(first);
    setPage(1);
  }, [coursesQuery.data, user.id]);

  const hasNoCourses = coursesQuery.isSuccess && coursesQuery.data.courses.length === 0;

  const feedQuery = useFeed(courseId, page, PAGE_SIZE);
  const saveMutation = useSaveMutation();
  const removeMutation = useRemovePostMutation();

  const handleToggleSave = (post: Post) => {
    saveMutation.mutate({ postId: post.id, intent: post.hasSaved ? "unsave" : "save" });
  };

  const handleRemove = (post: Post) => {
    if (window.confirm(t("post.removeConfirm"))) {
      removeMutation.mutate(post.id);
    }
  };

  return (
    <section className="page">
      <div className="page__header">
        {coursesQuery.data && coursesQuery.data.courses.length > 0 && (
          <CoursePicker
            courses={coursesQuery.data.courses}
            courseId={courseId}
            onChange={(id) => {
              setCourseId(id);
              setPage(1);
            }}
          />
        )}
      </div>

      {coursesQuery.isPending && <PostListSkeleton />}
      {coursesQuery.isError && <ErrorBanner error={coursesQuery.error} />}

      {hasNoCourses && <EmptyState title={t("feed.noCourses.title")} body={t("feed.noCourses.body")} icon="posts" />}

      {!hasNoCourses && (
        <>
          {feedQuery.isPending && <PostListSkeleton />}
          {feedQuery.isError && <ErrorBanner error={feedQuery.error} />}

          {feedQuery.data && feedQuery.data.posts.length === 0 && (
            <EmptyState title={t("feed.empty.title")} body={t("feed.empty.body")} icon="posts" />
          )}

          {feedQuery.data && feedQuery.data.posts.length > 0 && (
            <>
              <div className="post-list">
                {feedQuery.data.posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onToggleSave={handleToggleSave}
                    savePending={saveMutation.isPending && saveMutation.variables?.postId === post.id}
                    canRemove={user.role === "moderator"}
                    onRemove={handleRemove}
                  />
                ))}
              </div>
              <Pagination page={page} pageSize={PAGE_SIZE} total={feedQuery.data.total} onPageChange={setPage} />
            </>
          )}
        </>
      )}
    </section>
  );
}