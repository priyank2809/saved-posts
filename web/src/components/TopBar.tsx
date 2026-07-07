import { STUB_USERS, useCurrentUser } from "../context/CurrentUserContext";
import { useI18n, SUPPORTED_LOCALES, type Locale } from "../i18n/I18nProvider";

interface Props {
  activeTab: "feed" | "saved";
  onTabChange: (tab: "feed" | "saved") => void;
}

const LOCALE_LABELS: Record<Locale, string> = { en: "English", hi: "हिन्दी" };

export function TopBar({ activeTab, onTabChange }: Props) {
  const { user, setUserId } = useCurrentUser();
  const { t, locale, setLocale } = useI18n();

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__mark" aria-hidden="true">
          ◆
        </span>
        <span>{t("app.title")}</span>
      </div>

      <nav className="topbar__nav">
        <button className={activeTab === "feed" ? "is-active" : ""} onClick={() => onTabChange("feed")}>
          {t("nav.feed")}
        </button>
        <button className={activeTab === "saved" ? "is-active" : ""} onClick={() => onTabChange("saved")}>
          {t("nav.saved")}
        </button>
      </nav>

      <div className="topbar__controls">
        <label className="topbar__control">
          <span>{t("user.switcher.label")}</span>
          <select value={user.id} onChange={(e) => setUserId(e.target.value)}>
            {STUB_USERS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </label>

        <label className="topbar__control">
          <span className="visually-hidden">Language</span>
          <select value={locale} onChange={(e) => setLocale(e.target.value as Locale)}>
            {SUPPORTED_LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_LABELS[l]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
