import { ApiError } from "../api/types";
import { useI18n } from "../i18n/I18nProvider";

export function ErrorBanner({ error }: { error: unknown }) {
  const { t } = useI18n();
  const status = error instanceof ApiError ? error.status : undefined;
  const key = status === 401 || status === 403 || status === 404 ? `state.error.${status}` : "state.error";
  return (
    <div className="error-banner" role="alert">
      {t(key)}
    </div>
  );
}
