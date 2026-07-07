import { useI18n } from "../i18n/I18nProvider";

interface Props {
  saved: boolean;
  pending: boolean;
  onToggle: () => void;
}

export function BookmarkToggle({ saved, pending, onToggle }: Props) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      className={`bookmark-toggle${saved ? " is-saved" : ""}`}
      onClick={onToggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? t("post.saved") : t("post.save")}
      title={saved ? t("post.saved") : t("post.save")}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path
          d="M6 3.5C6 2.7 6.7 2 7.5 2h9c.8 0 1.5.7 1.5 1.5V21l-6-3.8L6 21V3.5Z"
          fill={saved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      <span>{saved ? t("post.saved") : t("post.save")}</span>
    </button>
  );
}
