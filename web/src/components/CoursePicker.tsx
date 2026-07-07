import type { Course } from "../api/types";
import { useI18n } from "../i18n/I18nProvider";

interface Props {
  courses: Course[];
  courseId: string | undefined;
  onChange: (courseId: string) => void;
}

export function CoursePicker({ courses, courseId, onChange }: Props) {
  const { t } = useI18n();
  return (
    <label className="course-picker">
      <span>{t("course.picker.label")}</span>
      <select value={courseId ?? ""} onChange={(e) => onChange(e.target.value)}>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
