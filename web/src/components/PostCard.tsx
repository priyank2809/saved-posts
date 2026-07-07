import type { Post } from "../api/types";
import { useI18n } from "../i18n/I18nProvider";
import { BookmarkToggle } from "./BookmarkToggle";

interface Props {
  post: Post;
  onToggleSave: (post: Post) => void;
  savePending: boolean;
  onRemove?: (post: Post) => void;
  canRemove?: boolean;
}

export function PostCard({ post, onToggleSave, savePending, onRemove, canRemove }: Props) {
  const { t, tPlural } = useI18n();
  const date = new Date(post.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <article className="post-card">
      <div className="post-card__main">
        <h3 className="post-card__title">{post.title}</h3>
        <p className="post-card__body">{post.body}</p>
        <div className="post-card__meta">
          <span>{t("post.by", { name: post.authorName })}</span>
          <span aria-hidden="true">·</span>
          <span>{date}</span>
          <span aria-hidden="true">·</span>
          <span>{tPlural("post.savesCount", post.savesCount)}</span>
        </div>
      </div>
      <div className="post-card__actions">
        <BookmarkToggle saved={post.hasSaved} pending={savePending} onToggle={() => onToggleSave(post)} />
        {canRemove && onRemove && (
          <button type="button" className="post-card__remove" onClick={() => onRemove(post)}>
            {t("post.remove")}
          </button>
        )}
      </div>
    </article>
  );
}
