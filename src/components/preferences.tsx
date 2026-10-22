"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Languages, Moon, Sun } from "lucide-react";
import {
  euro as formatEuro,
  formatDate as formatCalendarDate,
} from "@/lib/tracker";
import { translate, type Locale } from "@/lib/translations";

const KEY = "quit-smoking:appearance";
const CHANGE_EVENT = "quit-smoking:appearance-change";
const DEFAULT = "light:it";
type Theme = "light" | "dark";
let volatilePreference: string | undefined;

function snapshot() {
  if (volatilePreference) return volatilePreference;
  try {
    const value = localStorage.getItem(KEY);
    return value && /^(light|dark):(it|en)$/.test(value) ? value : DEFAULT;
  } catch {
    return DEFAULT;
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}
const PreferencesContext = createContext<{
  theme: Theme;
  locale: Locale;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
} | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const value = useSyncExternalStore(subscribe, snapshot, () => DEFAULT);
  const [theme, locale] = value.split(":") as [Theme, Locale];
  function save(nextTheme: Theme, nextLocale: Locale) {
    try {
      localStorage.setItem(KEY, `${nextTheme}:${nextLocale}`);
      volatilePreference = undefined;
    } catch {
      volatilePreference = `${nextTheme}:${nextLocale}`;
    }
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.lang = nextLocale;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  useEffect(() => {
    if (snapshot() !== value) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = locale;
  }, [theme, locale, value]);
  return (
    <PreferencesContext
      value={{
        theme,
        locale,
        setTheme: (next) => save(next, locale),
        setLocale: (next) => save(theme, next),
      }}
    >
      {children}
    </PreferencesContext>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("PreferencesProvider is required");
  const { locale } = context;
  return useMemo(
    () => ({
      ...context,
      t: (message: string, values?: Record<string, string | number>) =>
        translate(message, locale, values),
      formatDate: (date: string, options?: Intl.DateTimeFormatOptions) =>
        formatCalendarDate(date, options, locale),
      euro: (cents: number) => formatEuro(cents, locale),
    }),
    [context, locale],
  );
}

export function AppearanceControls() {
  const { theme, locale, setTheme, setLocale, t } = usePreferences();
  return (
    <div className="appearance-controls">
      <label className="language-control">
        <Languages size={15} aria-hidden="true" />
        <span className="sr-only">{t("Lingua")}</span>
        <select
          aria-label={t("Lingua")}
          value={locale}
          onChange={(event) => setLocale(event.target.value as Locale)}
        >
          <option value="it">Italiano</option>
          <option value="en">English</option>
        </select>
      </label>
      <button
        className="icon-button theme-toggle"
        type="button"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        aria-label={t(
          theme === "dark" ? "Attiva tema chiaro" : "Attiva tema scuro",
        )}
        title={t(theme === "dark" ? "Attiva tema chiaro" : "Attiva tema scuro")}
        aria-pressed={theme === "dark"}
      >
        {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </div>
  );
}

export function AppLoading() {
  const { t } = usePreferences();
  return (
    <div className="app-loading">
      <span className="brand-mark">q</span>
      <p>{t("Prepariamo il tuo spazio…")}</p>
    </div>
  );
}
