import { useState } from "react";
import { useSavedPosts, useSaveMutation } from "../api/queries";
import { PostCard } from "../components/PostCard";
import { EmptyState } from "../components/EmptyState";
import { Pagination } from "../components/Pagination";
import { PostListSkeleton } from "../components/PostListSkeleton";
import { ErrorBanner } from "../components/ErrorBanner";
import { useI18n } from "../i18n/I18nProvider";
import type { Post } from "../api/types";

const PAGE_SIZE = 5;

export function SavedPage() {
  const { t, tPlural } = useI18n();
  const [page, setPage] = useState(1);
  const savedQuery = useSavedPosts(page, PAGE_SIZE);
  const saveMutation = useSaveMutation();

  const handleToggleSave = (post: Post) => {
    saveMutation.mutate({ postId: post.id, intent: "unsave" });
  };

  return (
    <section className="page">
      <div className="page__header">
        {savedQuery.data && <p className="page__count">{tPlural("footer.savedPosts", savedQuery.data.total)}</p>}
      </div>

      {savedQuery.isPending && <PostListSkeleton />}
      {savedQuery.isError && <ErrorBanner error={savedQuery.error} />}

      {savedQuery.data && savedQuery.data.posts.length === 0 && (
        <EmptyState title={t("saved.empty.title")} body={t("saved.empty.body")} icon="bookmark" />
      )}

      {savedQuery.data && savedQuery.data.posts.length > 0 && (
        <>
          <div className="post-list">
            {savedQuery.data.posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onToggleSave={handleToggleSave}
                savePending={saveMutation.isPending && saveMutation.variables?.postId === post.id}
              />
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={savedQuery.data.total} onPageChange={setPage} />
        </>
      )}
    </section>
  );
}
