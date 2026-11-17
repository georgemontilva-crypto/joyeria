import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { strings, type Strings } from "./strings";
import { formatMoney, type Locale } from "@shared/format";

type Bilingual<K extends string> = { [P in `${K}En` | `${K}Es`]?: string | null };

type I18n = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Strings;
  money: (cents: number) => string;
  /** Picks the field for the current language, falling back to the other one. */
  pick: <K extends string>(obj: Bilingual<K>, key: K) => string;
};

const Ctx = createContext<I18n | null>(null);
const KEY = "md_locale";

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "es") return saved;
  } catch {
    /* storage unavailable: fall through to the browser language */
  }
  return navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* the choice just won't persist */
    }
  }, []);

  const value = useMemo<I18n>(
    () => ({
      locale,
      setLocale,
      t: strings[locale],
      money: (cents) => formatMoney(cents, locale),
      pick: (obj, key) => {
        const rec = obj as Record<string, string | null | undefined>;
        const primary = rec[`${key}${locale === "es" ? "Es" : "En"}`];
        return primary || rec[`${key}${locale === "es" ? "En" : "Es"}`] || "";
      },
    }),
    [locale, setLocale],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used inside I18nProvider");
  return v;
}
