export function PostListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="post-list" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div className="post-card post-card--skeleton" key={i}>
          <div className="skeleton-line skeleton-line--title" />
          <div className="skeleton-line" />
          <div className="skeleton-line skeleton-line--short" />
        </div>
      ))}
    </div>
  );
}
