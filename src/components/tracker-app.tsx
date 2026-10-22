"use client";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDownRight,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Cigarette,
  Coins,
  Flame,
  LayoutDashboard,
  Leaf,
  Minus,
  PanelLeft,
  Plus,
  Settings2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Wind,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppearanceControls, usePreferences } from "./preferences";
import { useShell } from "./shell-context";
import type { TrackerView } from "./tracker-page";
import {
  recordDay,
  saveSettings,
  refreshTracker,
  resetJourney,
} from "@/app/actions";
import {
  addDays,
  calendarDates,
  dateInZone,
  getStats,
  heatLevel,
  type ActionResult,
  type DayLog,
  type Profile,
  type TrackerData,
} from "@/lib/tracker";
type RunAction = (action: () => Promise<ActionResult>, message: string) => void;
export function TrackerApp({
  initialData,
  view,
  today,
}: {
  initialData: TrackerData | null;
  view: TrackerView;
  today: string;
}) {
  const { t } = usePreferences();
  const router = useRouter();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useShell();
  const [data, setData] = useState(initialData);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState({ text: "", error: false });
  const [helpOpen, setHelpOpen] = useState(false);
  const calendarRef = useRef<HTMLElement>(null);
  const run: RunAction = (action, message) => {
    setFeedback({ text: "", error: false });
    startTransition(async () => {
      try {
        const result = await action();
        if (result.error) {
          setFeedback({ text: result.error, error: true });
          return;
        }
        if (result.data) {
          setData(result.data);
          if (!data) window.scrollTo(0, 0);
        }
        if (!data && result.data) router.push("/");
        setFeedback({ text: message, error: false });
      } catch {
        setFeedback({
          text: t(
            "Salvataggio non riuscito. Controlla la connessione e riprova.",
          ),
          error: true,
        });
      }
    });
  };
  const timeZone = data?.profile.timeZone;
  const currentDay = data?.today;
  useEffect(() => {
    if (!timeZone || !currentDay) return;
    let active = true;
    const refresh = async () => {
      try {
        const result = await refreshTracker();
        if (active && result.data) setData(result.data);
      } catch {
        /* Keep the last saved view if the connection is unavailable. */
      }
    };
    const timer = window.setInterval(() => {
      if (dateInZone(timeZone) !== currentDay) void refresh();
    }, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [timeZone, currentDay]);
  useEffect(() => {
    if (!mobileOpen) return;
    const sidebar = document.getElementById("app-navigation");
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>(
          "a[href], button:not(:disabled)",
        ) ?? [],
      ).filter((node) => node.getClientRects().length > 0);
    focusable()[0]?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
      if (event.key !== "Tab") return;
      const nodes = focusable();
      const first = nodes[0];
      const last = nodes.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [mobileOpen, setMobileOpen]);
  const pageTitle =
    view === "calendar"
      ? t("Il mio diario")
      : view === "settings"
        ? t("Impostazioni")
        : t("Panoramica");
  const emptyData: TrackerData = {
    profile: {
      cigarettesPerDay: 0,
      packPriceCents: 0,
      packSize: 20,
      timeZone: "Europe/Rome",
      startedOn: today,
    },
    logs: [],
    today,
  };
  const navItems = [
    {
      view: "overview",
      href: "/",
      label: t("Panoramica"),
      Icon: LayoutDashboard,
    },
    {
      view: "calendar",
      href: "/diario",
      label: t("Il mio diario"),
      Icon: CalendarDays,
    },
    {
      view: "settings",
      href: "/impostazioni",
      label: t("Impostazioni"),
      Icon: Settings2,
    },
  ];
  function closeNavigation() {
    setMobileOpen(false);
  }
  return (
    <div
      className={`app-shell ${collapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "mobile-nav-open" : ""} view-${view}`}
    >
      <a className="skip-link" href="#main-content">
        {t("Vai al contenuto")}
      </a>
      {mobileOpen ? (
        <button
          className="sidebar-scrim"
          aria-label={t("Chiudi navigazione")}
          onClick={closeNavigation}
        />
      ) : null}
      <aside
        className="sidebar"
        id="app-navigation"
        aria-label={t("Menu dell\u2019app")}
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen || undefined}
      >
        <button
          className="icon-button mobile-nav-close"
          onClick={closeNavigation}
          aria-label={t("Chiudi menu")}
        >
          <X size={18} />
        </button>
        <div className="brand">
          <span className="brand-mark">
            <Wind size={22} strokeWidth={2} />
          </span>
          <div className="brand-copy">
            <strong>
              Quit Smoking<span className="brand-period">.</span>
            </strong>
            <span>{t("Un giorno alla volta")}</span>
          </div>
        </div>
        <div className="sidebar-group-label">{t("Il tuo percorso")}</div>
        <nav aria-label={t("Navigazione principale")}>
          {navItems.map(({ view: navView, href, label, Icon }) => (
            <Link
              key={href}
              href={navView === "settings" && !data ? "/onboarding" : href}
              className={`nav-item ${view === navView ? "active" : ""}`}
              onClick={closeNavigation}
              aria-current={view === navView ? "page" : undefined}
              aria-label={label}
              title={label}
            >
              <Icon size={18} aria-hidden="true" />
              <span className="nav-label">{label}</span>
              {navView === "calendar" && data ? (
                <span className="nav-count">
                  {data.logs.filter((log) => log.confirmed).length}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="small-icon">
            <Leaf size={17} />
          </span>
          <strong>{t("Ogni scelta conta.")}</strong>
          <p>
            {t("Non serve un percorso perfetto.")}
            <br />
            {t("Basta il prossimo passo.")}
          </p>
          <span className="note-line" />
        </div>
        <div className="sidebar-bottom">
          <button
            className="nav-item"
            aria-label={t("Come funziona")}
            title={t("Come funziona")}
            onClick={() => {
              closeNavigation();
              setHelpOpen(true);
            }}
          >
            <CircleHelp size={17} />
            <span className="nav-label">{t("Come funziona")}</span>
          </button>
          <div className="profile-box">
            <span className="avatar">{t("TU")}</span>
            <div>
              <strong>{t("Il tuo spazio")}</strong>
              <span>{t("Il tuo percorso personale")}</span>
            </div>
            <ShieldCheck size={16} />
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button sidebar-toggle desktop-sidebar-toggle"
              onClick={() => setCollapsed(!collapsed)}
              aria-expanded={!collapsed}
              aria-controls="app-navigation"
              aria-label={
                collapsed ? t("Espandi sidebar") : t("Comprimi sidebar")
              }
            >
              <PanelLeft size={18} />
            </button>
            <button
              className="icon-button sidebar-toggle mobile-sidebar-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-controls="app-navigation"
              aria-label={t("Apri menu")}
            >
              <PanelLeft size={18} />
            </button>
            <span className="breadcrumb-parent">{t("Il tuo percorso")}</span>
            <ChevronRight size={13} />
            <strong>{pageTitle}</strong>
          </div>
          <div className="topbar-end">
            <AppearanceControls />
            <span
              className="profile-avatar"
              role="img"
              aria-label={t("Profilo personale")}
              title={t("Profilo personale")}
            >
              <UserRound size={18} strokeWidth={1.6} aria-hidden="true" />
            </span>
          </div>
        </header>
        <main id="main-content" className="main-content">
          {view === "settings" ? (
            data ? (
              <SettingsView
                key={`${data.profile.cigarettesPerDay}-${data.profile.packPriceCents}-${data.profile.packSize}`}
                profile={data.profile}
                pending={pending}
                run={run}
              />
            ) : (
              <SetupPrompt onSettings={() => router.push("/onboarding")} />
            )
          ) : (
            <Dashboard
              data={data ?? emptyData}
              configured={Boolean(data)}
              view={view}
              run={run}
              pending={pending}
              calendarRef={calendarRef}
              onSettings={() =>
                router.push(data ? "/impostazioni" : "/onboarding")
              }
            />
          )}
          <div
            className={`feedback ${feedback.error ? "is-error" : ""}`}
            role={feedback.error ? "alert" : "status"}
            aria-live="polite"
          >
            {feedback.text ? (
              <>
                {feedback.error ? (
                  <CircleHelp size={16} />
                ) : (
                  <Check size={16} />
                )}
                {t(feedback.text)}
              </>
            ) : null}
          </div>
        </main>
        <footer className="workspace-footer">
          <span>
            <Wind size={13} />
            {t("Meno fumo. Pi\u00F9 spazio per te.")}
          </span>
          <span>{t("Fatto di piccoli passi")}</span>
        </footer>
      </div>
      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t("Un piccolo gesto, ogni giorno")}
      >
        <div className="help-content">
          <p>
            {t(
              "Imposta le tue abitudini iniziali e conferma la giornata nel diario. Le giornate confermate con zero sigarette costruiscono la tua serie senza fumo.",
            )}
          </p>
          <p>
            {t(
              "A fine giornata, conferma il totale nel diario. Anche zero \u00E8 un dato: le giornate confermate senza sigarette diventano verde scuro.",
            )}
          </p>
          <p>
            {t(
              "Seleziona una cella del calendario per correggere un giorno passato. I giorni vuoti non vengono considerati giorni senza fumo.",
            )}
          </p>
          <p>
            {t(
              "Il risparmio \u00E8 una stima rispetto alla tua media iniziale e usa solo giornate confermate. Eventuali consumi oltre la media riducono il saldo.",
            )}
          </p>
          <div className="info-note">
            <ShieldCheck size={18} />
            <span>
              {t(
                "I dati sono salvati nel database del progetto. Questo browser riconosce il tuo diario tramite un cookie: cancellandolo perdi l\u2019accesso a questo profilo. Il prototipo non include un account n\u00E9 la sincronizzazione tra dispositivi.",
              )}
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
function Modal({
  open,
  onClose,
  title,
  children,
  busy = false,
}: {
  busy?: boolean;
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const { t } = usePreferences();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClose={onClose}
      aria-busy={busy}
      aria-label={title}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          disabled={busy}
          aria-label={t("Chiudi finestra")}
        >
          <X size={18} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
type SettingsValues = {
  cigarettesPerDay: number;
  packPrice: number;
  packSize: number;
  timeZone: string;
};
function SetupForm({
  profile,
  pending,
  onSave,
}: {
  profile?: Profile;
  pending: boolean;
  onSave: (values: SettingsValues) => void;
}) {
  const { t, euro } = usePreferences();
  const [daily, setDaily] = useState(profile?.cigarettesPerDay ?? 10);
  const [price, setPrice] = useState(
    profile ? (profile.packPriceCents / 100).toFixed(2) : "6.00",
  );
  const [packSize, setPackSize] = useState(profile?.packSize ?? 20);
  const monthly = ((daily * Number(price)) / packSize) * 30 * 100;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      cigarettesPerDay: daily,
      packPrice: Number(price.replace(",", ".")),
      packSize,
      timeZone:
        profile?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }
  return (
    <form onSubmit={submit} className="setup-form">
      <div className="field">
        <label htmlFor="daily-cigarettes">
          {t("Quante sigarette fumi al giorno?")}
        </label>
        <span className="field-hint">
          {t("La tua media abituale, prima di iniziare.")}
        </span>
        <div className="number-stepper">
          <button
            type="button"
            disabled={pending || daily <= 1}
            onClick={() => setDaily(Math.max(1, daily - 1))}
            aria-label={t("Riduci consumo abituale")}
          >
            <Minus size={17} />
          </button>
          <div>
            <input
              id="daily-cigarettes"
              name="daily"
              type="number"
              min="1"
              max="100"
              required
              value={daily || ""}
              onChange={(e) => setDaily(Number(e.target.value))}
              disabled={pending}
            />
            <span>{t("sigarette / giorno")}</span>
          </div>
          <button
            type="button"
            disabled={pending || daily >= 100}
            onClick={() => setDaily(Math.min(100, daily + 1))}
            aria-label={t("Aumenta consumo abituale")}
          >
            <Plus size={17} />
          </button>
        </div>
      </div>
      <div className="fields-row">
        <div className="field">
          <label htmlFor="pack-price">{t("Prezzo del pacchetto")}</label>
          <div className="input-with-suffix">
            <input
              id="pack-price"
              type="number"
              name="price"
              inputMode="decimal"
              min="0.10"
              max="100"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              disabled={pending}
            />
            <span>€</span>
          </div>
        </div>
        <div className="field">
          <label htmlFor="pack-size">{t("Sigarette nel pacchetto")}</label>
          <div className="input-with-suffix">
            <input
              id="pack-size"
              type="number"
              name="size"
              min="1"
              max="100"
              value={packSize || ""}
              onChange={(e) => setPackSize(Number(e.target.value))}
              required
              disabled={pending}
            />
            <span>{t("pz")}</span>
          </div>
        </div>
      </div>
      <div className="estimate">
        <Coins size={18} />
        <div>
          <span>{t("La tua spesa di riferimento")}</span>
          <strong>
            {Number.isFinite(monthly) ? euro(monthly) : "—"}
            <small>{t("/ mese")}</small>
          </strong>
        </div>
        <span className="estimate-days">{t("su 30 giorni")}</span>
      </div>
      <button
        className="button primary setup-submit"
        disabled={pending}
        type="submit"
      >
        {pending
          ? t("Salvataggio\u2026")
          : profile
            ? t("Salva impostazioni")
            : t("Inizia il mio percorso")}
        <ArrowRight size={17} />
      </button>
      {!profile ? (
        <p className="form-footnote">
          <ShieldCheck size={13} />
          {t("Nessuna registrazione. Puoi modificare tutto in seguito.")}
        </p>
      ) : null}
    </form>
  );
}

function Dashboard({
  data,
  run,
  pending,
  calendarRef,
  onSettings,
  configured,
  view,
}: {
  configured: boolean;
  view: "overview" | "calendar";
  data: TrackerData;
  run: RunAction;
  pending: boolean;
  calendarRef: React.RefObject<HTMLElement | null>;
  onSettings: () => void;
}) {
  const { t, formatDate, euro } = usePreferences();
  const { profile, logs, today } = data;
  const stats = getStats(logs, today);
  const [selected, setSelected] = useState(today);
  const [weeks, setWeeks] = useState(view === "calendar" ? 53 : 26);
  const selectedLog = logs.find((log) => log.date === selected);
  const lastWeek = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const weeklyLogs = logs.filter(
    (log) => lastWeek.includes(log.date) && log.confirmed,
  );
  const weeklyAvoided = Math.max(
    0,
    weeklyLogs.reduce((sum, log) => sum + log.baseline - log.count, 0),
  );
  const weeklyBaseline = weeklyLogs.reduce((sum, log) => sum + log.baseline, 0);
  const reduction = weeklyBaseline
    ? Math.max(0, Math.round((weeklyAvoided / weeklyBaseline) * 100))
    : 0;

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            {view === "calendar"
              ? t("Il tuo diario")
              : t("Un giorno alla volta")}
            <span className="heading-dot">.</span>
          </h1>
          <p>
            {formatDate(today, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            <span className="heading-separator">·</span>
            {t("Questo \u00E8 il tuo percorso.")}
          </p>
        </div>
        <button className="button secondary" onClick={onSettings}>
          <Settings2 size={15} />
          {t("Le mie abitudini")}
        </button>
      </div>
      <section className="stats-grid" aria-label={t("I tuoi progressi")}>
        <StatCard
          label={t("Risparmio stimato")}
          value={configured ? euro(stats.savedCents) : "—"}
          foot={t("Sulle giornate confermate")}
          icon={<Coins size={16} />}
          trend={logs}
        />
        <StatCard
          label={t("Sigarette evitate")}
          value={configured ? String(stats.avoided) : "—"}
          unit={t("in totale")}
          foot={t("Rispetto al consumo abituale")}
          icon={<Cigarette size={16} />}
          trend={logs}
        />
        <StatCard
          label={t("Giorni senza fumo")}
          value={configured ? String(stats.smokeFree) : "—"}
          unit={stats.smokeFree === 1 ? t("giorno") : t("giorni")}
          foot={`${stats.confirmedDays} ${stats.confirmedDays === 1 ? t("giornata confermata") : t("giornate confermate")}`}
          icon={<Leaf size={16} />}
          trend={logs}
        />
        <StatCard
          label={t("Serie attuale")}
          value={configured ? String(stats.streak) : "—"}
          unit={stats.streak === 1 ? t("giorno") : t("giorni")}
          foot={t("Giornate consecutive senza fumo")}
          icon={<Flame size={16} />}
          trend={logs}
        />
      </section>
      <div className="dashboard-grid">
        <section className="calendar-panel panel" ref={calendarRef} id="diario">
          <div className="panel-heading">
            <h2>
              <CalendarDays size={15} />
              {t("Il tuo diario")}
            </h2>
            <div className="segmented" aria-label={t("Periodo del calendario")}>
              {[26, 53].map((value) => (
                <button
                  key={value}
                  aria-pressed={weeks === value}
                  className={weeks === value ? "selected" : ""}
                  onClick={() => setWeeks(value)}
                >
                  {value === 26 ? t("6 mesi") : t("Un anno")}
                </button>
              ))}
            </div>
          </div>
          <div className="calendar-inner">
            <div className="calendar-summary">
              <div>
                <strong>{stats.smokeFree}</strong>
                <span>
                  {t("giorni senza fumo")}
                  <br />
                  <small>{t("Ogni quadratino racconta una giornata.")}</small>
                </span>
              </div>
              <span className="calendar-summary-icon">
                <Leaf size={23} strokeWidth={1.4} />
              </span>
            </div>
            <Heatmap
              today={today}
              start={profile.startedOn}
              logs={logs}
              selected={selected}
              weeks={weeks}
              onSelect={setSelected}
            />
            <div className="calendar-legend">
              <span>
                {t("Da confermare")}
                <i className="legend-cell pending-cell" />
              </span>
              <span>
                {t("Consumo abituale")}
                <i className="legend-cell level-1" />
              </span>
              <span>
                {t("Meno fumo")}
                <i className="legend-cell level-2" />
                <i className="legend-cell level-3" />
                <i className="legend-cell level-4" />
                {t("Zero")}
              </span>
            </div>
          </div>
          <div className="panel-foot">
            <span>
              <span className="status-dot" />{" "}
              {configured
                ? t("Dal {date}", { date: formatDate(profile.startedOn) })
                : t("Il tuo calendario \u00E8 pronto")}
            </span>
            <button onClick={() => setSelected(today)}>
              {t("Vai a oggi")}
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
        <div className="right-column">
          {configured ? (
            <>
              <DayEditor
                key={`${selected}-${selectedLog?.count}-${selectedLog?.confirmed}`}
                date={selected}
                today={today}
                log={selectedLog}
                pending={pending}
                run={run}
                start={profile.startedOn}
                onDate={setSelected}
              />
            </>
          ) : (
            <SetupPrompt onSettings={onSettings} />
          )}
          <section className="weekly-panel panel">
            <div className="panel-heading">
              <h2>
                <ArrowDownRight size={15} />
                {t("Gli ultimi 7 giorni")}
              </h2>
              <span className="subtle-tag">
                {weeklyLogs.length}
                {t("/7 confermati")}
              </span>
            </div>
            <div className="weekly-inner">
              <div className="weekly-metric">
                <strong>{weeklyAvoided}</strong>
                <span>{t("sigarette evitate")}</span>
                {weeklyLogs.length ? (
                  <span className="reduction-tag">−{reduction}%</span>
                ) : null}
              </div>
              <div className="week-bars">
                {lastWeek.map((date) => {
                  const log = logs.find((entry) => entry.date === date);
                  return (
                    <div
                      key={date}
                      className={date === today ? "current-day" : ""}
                    >
                      <div className="bar-track">
                        <span
                          style={{
                            height: log?.confirmed
                              ? `${Math.max(8, Math.min(100, (1 - log.count / log.baseline) * 100))}%`
                              : "0%",
                          }}
                        />
                        <i />
                      </div>
                      <span>
                        {formatDate(date, {
                          weekday: "narrow",
                          day: undefined,
                          month: undefined,
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="weekly-hint">
                {weeklyLogs.length
                  ? t("Il confronto usa solo le giornate confermate.")
                  : t("Conferma la prima giornata per vedere i progressi.")}
              </p>
            </div>
          </section>
        </div>
      </div>
      {view === "calendar" ? <JournalHistory logs={logs} /> : null}
      <div className="bottom-note">
        <span>
          <Sparkles size={15} />
          {stats.confirmedDays
            ? t("Il percorso non deve essere perfetto. Deve essere il tuo.")
            : t("La prima cella si colora quando confermi la tua giornata.")}
        </span>
        <span>{t("Stime basate sulle tue abitudini")}</span>
      </div>
    </>
  );
}
function StatCard({
  label,
  value,
  unit,
  foot,
  icon,
  trend,
}: {
  label: string;
  value: string;
  unit?: string;
  foot: string;
  icon: ReactNode;
  trend: DayLog[];
}) {
  const recent = trend.filter((log) => log.confirmed).slice(-9);
  return (
    <article className="stat-wrap">
      <div className="stat-card">
        <div className="stat-label">
          {label}
          <span>{icon}</span>
        </div>
        <div className="stat-value">
          <strong>{value}</strong>
          {unit ? <span>{unit}</span> : null}
          <div className="spark-bars" aria-hidden="true">
            {recent.length ? (
              recent.map((log) => (
                <i
                  key={log.date}
                  style={{
                    height: `${Math.max(4, (1 - Math.min(1, log.count / log.baseline)) * 25)}px`,
                  }}
                />
              ))
            ) : (
              <span className="empty-spark">—</span>
            )}
          </div>
        </div>
      </div>
      <p>{foot}</p>
    </article>
  );
}
function Heatmap({
  today,
  start,
  logs,
  selected,
  weeks,
  onSelect,
}: {
  today: string;
  start: string;
  logs: DayLog[];
  selected: string;
  weeks: number;
  onSelect: (date: string) => void;
}) {
  const { formatDate, t } = usePreferences();
  const firstEntry = logs.reduce(
    (first, log) => (log.date < first ? log.date : first),
    today,
  );
  const dates = calendarDates(today, weeks, firstEntry);
  const firstVisibleDate = dates[0];
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const showCurrentWeek = () => {
      const target =
        document.getElementById(`day-${selected}`) ??
        document.getElementById(`day-${today}`);
      if (!target) return;
      const cell = target.getBoundingClientRect();
      const viewport = container.getBoundingClientRect();
      if (cell.left < viewport.left || cell.right > viewport.right) {
        container.scrollLeft += cell.left - viewport.left - 32;
      }
    };
    showCurrentWeek();
    const observer = new ResizeObserver(showCurrentWeek);
    observer.observe(container);
    return () => observer.disconnect();
  }, [today, weeks, firstVisibleDate, selected]);
  const byDate = new Map(logs.map((log) => [log.date, log]));
  const labels = Array.from({ length: weeks }, (_, i) => {
    const date = dates[i * 7] < firstEntry ? firstEntry : dates[i * 7];
    const previous =
      i > 0
        ? dates[(i - 1) * 7] < firstEntry
          ? firstEntry
          : dates[(i - 1) * 7]
        : "";
    return i === 0 || date.slice(0, 7) !== previous.slice(0, 7)
      ? formatDate(date, { day: undefined, month: "short" })
      : "";
  });
  function move(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const directions: Record<string, number> = {
      ArrowUp: -1,
      ArrowDown: 1,
      ArrowLeft: -7,
      ArrowRight: 7,
      Home:
        dates.findIndex((date) => date >= firstEntry && date >= start) - index,
      End: dates.indexOf(today) - index,
    };
    if (!(event.key in directions)) return;
    event.preventDefault();
    const next = index + directions[event.key];
    if (
      next >= 0 &&
      next < dates.length &&
      dates[next] >= start &&
      dates[next] <= today
    ) {
      onSelect(dates[next]);
      document.getElementById(`day-${dates[next]}`)?.focus();
    }
  }
  return (
    <div
      ref={scrollRef}
      className={`heatmap-scroll ${weeks === 53 ? "annual" : ""}`}
    >
      <div
        className="heatmap"
        style={{ "--weeks": weeks } as React.CSSProperties}
      >
        <div className="month-labels">
          {labels.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
        <div className="weekday-labels" aria-hidden="true">
          <span>{t("Lun")}</span>
          <span />
          <span>{t("Mer")}</span>
          <span />
          <span>{t("Ven")}</span>
          <span />
          <span>{t("Dom")}</span>
        </div>
        <div
          className="heatmap-grid"
          role="group"
          aria-label={t(
            "Calendario delle giornate, usa le frecce per navigare",
          )}
        >
          <>
            {dates.map((date, index) => {
              if (date < firstEntry)
                return (
                  <span
                    key={date}
                    className="heat-cell calendar-padding"
                    aria-hidden="true"
                  />
                );
              const log = byDate.get(date);
              const disabled = date < start || date > today;
              const label = `${formatDate(date, { year: "numeric" })}: ${disabled ? (date > today ? t("giorno futuro") : t("prima dell\u2019inizio del percorso")) : !log ? t("nessuna registrazione") : `${log.count} ${log.count === 1 ? t("sigaretta") : t("sigarette")}, ${log.confirmed ? t("giornata confermata") : t("da confermare")}`}`;
              return (
                <button
                  id={`day-${date}`}
                  key={date}
                  className={`heat-cell level-${heatLevel(log)} ${log && !log.confirmed ? "has-draft" : ""} ${date === today ? "is-today" : ""} ${disabled ? "unavailable" : ""}`}
                  disabled={disabled}
                  tabIndex={
                    !disabled &&
                    date ===
                      (selected >= firstEntry && dates.includes(selected)
                        ? selected
                        : today)
                      ? 0
                      : -1
                  }
                  aria-label={label}
                  aria-pressed={!disabled && date === selected}
                  title={label}
                  onClick={() => onSelect(date)}
                  onKeyDown={(e) => move(e, index)}
                />
              );
            })}
          </>
        </div>
      </div>
    </div>
  );
}
function DayEditor({
  date,
  today,
  log,
  pending,
  run,
  start,
  onDate,
}: {
  date: string;
  today: string;
  log?: DayLog;
  pending: boolean;
  run: RunAction;
  start: string;
  onDate: (date: string) => void;
}) {
  const { t, formatDate } = usePreferences();
  const [count, setCount] = useState(log?.count ?? 0);
  return (
    <section className="day-panel panel">
      <div className="panel-heading">
        <h2>
          <Target size={15} />
          {t("La tua giornata")}
        </h2>
        <span className={`day-state ${log?.confirmed ? "confirmed" : ""}`}>
          {log?.confirmed ? (
            <>
              <Check size={12} />
              {t("Confermata")}
            </>
          ) : (
            t("Da confermare")
          )}
        </span>
      </div>
      <div className="day-inner">
        <div className="day-date">
          <button
            className="icon-button"
            aria-label={t("Giorno precedente")}
            disabled={date <= start || pending}
            onClick={() => onDate(addDays(date, -1))}
          >
            <ChevronLeft size={16} />
          </button>
          <div>
            <strong>
              {date === today
                ? t("Oggi")
                : formatDate(date, {
                    weekday: "long",
                    day: undefined,
                    month: undefined,
                  })}
            </strong>
            <span>{formatDate(date, { year: "numeric" })}</span>
          </div>
          <button
            className="icon-button"
            aria-label={t("Giorno successivo")}
            disabled={date >= today || pending}
            onClick={() => onDate(addDays(date, 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () => recordDay({ date, operation: "confirm", count }),
              t("Giornata confermata. Il tuo diario \u00E8 aggiornato."),
            );
          }}
        >
          <label htmlFor="day-count">{t("Sigarette fumate")}</label>
          <div className="day-counter">
            <button
              type="button"
              className="icon-button"
              disabled={pending || count <= 0}
              aria-label={t("Riduci sigarette della giornata")}
              onClick={() => setCount(Math.max(0, count - 1))}
            >
              <Minus size={17} />
            </button>
            <input
              id="day-count"
              type="number"
              min="0"
              max="200"
              required
              value={count === 0 ? "0" : count || ""}
              disabled={pending}
              onChange={(e) => setCount(Number(e.target.value))}
            />
            <button
              type="button"
              className="icon-button"
              disabled={pending || count >= 200}
              aria-label={t("Aumenta sigarette della giornata")}
              onClick={() => setCount(Math.min(200, count + 1))}
            >
              <Plus size={17} />
            </button>
          </div>
          <button
            type="submit"
            className="button primary confirm-button"
            disabled={pending}
          >
            {pending
              ? t("Salvataggio\u2026")
              : log?.confirmed
                ? t("Aggiorna giornata")
                : t("Conferma giornata")}
            <Check size={15} />
          </button>
        </form>
        <p>
          {count === 0
            ? t("Nessuna sigaretta? Conferma il tuo giorno senza fumo.")
            : t("Un dato, nessun giudizio. Domani \u00E8 un altro giorno.")}
        </p>
      </div>
    </section>
  );
}
function SetupPrompt({ onSettings }: { onSettings: () => void }) {
  const { t } = usePreferences();
  return (
    <section className="setup-prompt panel">
      <div className="panel-heading">
        <h2>
          <Target size={15} />
          {t("Il primo passo")}
        </h2>
      </div>
      <div className="setup-prompt-inner">
        <span className="setup-prompt-icon">
          <Wind size={24} />
        </span>
        <h3>{t("Partiamo dalle tue abitudini.")}</h3>
        <p>
          {t(
            "Quante sigarette al giorno? Quanto costa un pacchetto? Due numeri per dare un valore ai tuoi progressi.",
          )}
        </p>
        <button className="button primary" onClick={onSettings}>
          {t("Imposta le mie abitudini")}
          <ArrowRight size={16} />
        </button>
        <span>{t("Nessun account da creare.")}</span>
      </div>
    </section>
  );
}
function SettingsView({
  profile,
  pending,
  run,
}: {
  profile: Profile;
  pending: boolean;
  run: RunAction;
}) {
  const { t, formatDate } = usePreferences();
  const [resetOpen, setResetOpen] = useState(false);
  const [resetError, setResetError] = useState("");
  function confirmReset() {
    run(async () => {
      setResetError("");
      try {
        const result = await resetJourney({ confirmed: true });
        if (result.error) setResetError(result.error);
        else setResetOpen(false);
        return result;
      } catch {
        const error =
          "Salvataggio non riuscito. Controlla la connessione e riprova.";
        setResetError(error);
        return { error };
      }
    }, t("Percorso azzerato. Riparti da oggi."));
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            {t("Le tue abitudini")}
            <span className="heading-dot">.</span>
          </h1>
          <p>{t("Il punto di partenza per misurare ogni progresso.")}</p>
        </div>
        <Link href="/onboarding" className="button secondary">
          <Wind size={15} />
          {t("Configurazione guidata")}
        </Link>
      </div>
      <div className="settings-grid">
        <section className="setup-card settings-card">
          <div className="section-heading">
            <span className="eyebrow">
              <Settings2 size={15} />
              {t("Impostazioni del percorso")}
            </span>
          </div>
          <SetupForm
            profile={profile}
            pending={pending}
            onSave={(values) =>
              run(() => saveSettings(values), t("Impostazioni aggiornate."))
            }
          />
        </section>
        <aside className="settings-aside">
          <div className="settings-info-card">
            <Leaf size={24} strokeWidth={1.5} />
            <h2>{t("Il tuo percorso rimane tuo.")}</h2>
            <p>
              {t(
                "Se le tue abitudini cambiano, aggiornale qui. Le giornate gi\u00E0 registrate conserveranno i valori originali: ogni progresso resta fedele al suo momento.",
              )}
            </p>
            <dl>
              <div>
                <dt>{t("Inizio del percorso")}</dt>
                <dd>{formatDate(profile.startedOn, { year: "numeric" })}</dd>
              </div>
              <div>
                <dt>{t("Fuso orario")}</dt>
                <dd>{profile.timeZone}</dd>
              </div>
            </dl>
          </div>
          <div className="info-note">
            <ShieldCheck size={18} />
            <span>
              {t(
                "Il diario \u00E8 collegato a questo browser. Conserva i cookie per continuare ad accedere ai tuoi dati.",
              )}
            </span>
          </div>
          <section className="reset-panel">
            <div className="reset-heading">
              <RotateCcw size={18} />
              <h2>{t("Ricomincia il percorso")}</h2>
            </div>
            <p>
              {t(
                "Azzera diario e statistiche per ripartire da oggi. Le tue abitudini, il tema e la lingua rimangono salvati.",
              )}
            </p>
            <button
              className="button danger-outline"
              type="button"
              disabled={pending}
              onClick={() => {
                setResetError("");
                setResetOpen(true);
              }}
            >
              <RotateCcw size={15} />
              {t("Azzera il diario")}
            </button>
          </section>
        </aside>
      </div>
      <Modal
        open={resetOpen}
        busy={pending}
        onClose={() => {
          if (!pending) setResetOpen(false);
        }}
        title={t("Ricominciare da oggi?")}
      >
        <p className="muted reset-description">
          {t(
            "Verranno eliminate tutte le giornate registrate e azzerate le statistiche. Le abitudini di riferimento rimarranno salvate.",
          )}
        </p>
        <p className="reset-warning">
          {t("Questa operazione non può essere annullata.")}
        </p>
        {resetError ? (
          <p className="feedback is-error" role="alert">
            {t(resetError)}
          </p>
        ) : null}
        <div className="modal-actions">
          <button
            className="button secondary"
            disabled={pending}
            onClick={() => setResetOpen(false)}
          >
            {t("Annulla")}
          </button>
          <button
            className="button danger"
            disabled={pending}
            onClick={confirmReset}
          >
            {pending ? t("Azzeramento…") : t("Azzera e ricomincia")}
          </button>
        </div>
      </Modal>
    </>
  );
}
function JournalHistory({ logs }: { logs: DayLog[] }) {
  const { t, formatDate, euro } = usePreferences();
  const history = [...logs]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);
  return (
    <section className="journal-history">
      <div className="history-heading">
        <div>
          <h2>{t("Le ultime giornate")}</h2>
          <p>
            {t(
              "Ogni dato pu\u00F2 essere aggiornato selezionando il giorno nel calendario.",
            )}
          </p>
        </div>
        <span className="subtle-tag">
          {logs.length}
          {t("registrazioni")}
        </span>
      </div>
      {history.length ? (
        <div className="history-table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">{t("Giornata")}</th>
                <th scope="col">{t("Sigarette")}</th>
                <th scope="col">{t("Risparmio stimato")}</th>
                <th scope="col">{t("Stato")}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((log) => (
                <tr key={log.date}>
                  <th scope="row">
                    {formatDate(log.date, {
                      weekday: "short",
                      year: "numeric",
                    })}
                  </th>
                  <td>{log.count}</td>
                  <td>
                    {log.confirmed
                      ? euro(
                          ((log.baseline - log.count) * log.packPriceCents) /
                            log.packSize,
                        )
                      : "—"}
                  </td>
                  <td>
                    <span
                      className={`history-status ${log.confirmed ? "confirmed" : ""}`}
                    >
                      {log.confirmed ? (
                        <Check size={13} />
                      ) : (
                        <CircleHelp size={13} />
                      )}
                      {log.confirmed ? t("Confermata") : t("Da confermare")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="history-empty">
          <CalendarDays size={22} />
          <p>{t("Le tue giornate compariranno qui, una alla volta.")}</p>
        </div>
      )}
    </section>
  );
}
