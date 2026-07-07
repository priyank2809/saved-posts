interface Props {
  title: string;
  body: string;
  icon?: "bookmark" | "posts";
}

export function EmptyState({ title, body, icon = "posts" }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon" aria-hidden="true">
        {icon === "bookmark" ? (
          <svg viewBox="0 0 24 24" width="32" height="32">
            <path
              d="M6 3.5C6 2.7 6.7 2 7.5 2h9c.8 0 1.5.7 1.5 1.5V21l-6-3.8L6 21V3.5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="32" height="32">
            <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <path d="M6 9h12M6 13h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
