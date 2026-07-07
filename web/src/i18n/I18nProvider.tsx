import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import en from "./en.json";
import hi from "./hi.json";

export const SUPPORTED_LOCALES = ["en", "hi"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const CATALOGS: Record<Locale, Record<string, string>> = { en, hi };
const STORAGE_KEY = "saved-posts.locale";

type Vars = Record<string, string | number>;

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`));
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Vars) => string;
  tPlural: (key: string, count: number, vars?: Vars) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (SUPPORTED_LOCALES as readonly string[]).includes(saved ?? "") ? (saved as Locale) : "en";
  });

  const setLocale = (l: Locale) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLocaleState(l);
  };

  const value = useMemo<I18nContextValue>(() => {
    const catalog = CATALOGS[locale];
    const pluralRules = new Intl.PluralRules(locale);

    const t = (key: string, vars?: Vars) => {
      const template = catalog[key] ?? key;
      return interpolate(template, vars);
    };

    const tPlural = (key: string, count: number, vars?: Vars) => {
      const mergedVars = { count, ...vars };
      if (count === 0 && catalog[`${key}.zero`]) {
        return interpolate(catalog[`${key}.zero`], mergedVars);
      }
      const category = pluralRules.select(count);
      const template = catalog[`${key}.${category}`] ?? catalog[`${key}.other`] ?? key;
      return interpolate(template, mergedVars);
    };

    return { locale, setLocale, t, tPlural };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}
