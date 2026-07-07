import { useI18n } from "../i18n/I18nProvider";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: Props) {
  const { t } = useI18n();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        {t("pagination.prev")}
      </button>
      <span className="pagination__label">{t("pagination.pageOf", { page, totalPages })}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        {t("pagination.next")}
      </button>
    </div>
  );
}
