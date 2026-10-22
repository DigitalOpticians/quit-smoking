"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Leaf,
  Minus,
  Plus,
  ShieldCheck,
  Wind,
} from "lucide-react";
import { saveSettings } from "@/app/actions";
import { parseSettings, type Profile } from "@/lib/tracker";
import { AppearanceControls, usePreferences } from "./preferences";

export function OnboardingWizard({ profile }: { profile?: Profile }) {
  const { t, euro } = usePreferences();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [daily, setDaily] = useState(profile?.cigarettesPerDay ?? 10);
  const [price, setPrice] = useState(
    profile ? String(profile.packPriceCents / 100) : "6.00",
  );
  const [packSize, setPackSize] = useState(profile?.packSize ?? 20);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const labels = [
    "Benvenuto",
    "Le tue abitudini",
    "Il pacchetto",
    "Il tuo percorso",
  ];
  const titles = [
    "Un nuovo inizio, un respiro alla volta.",
    "Quante sigarette fumi al giorno?",
    "Quanto costa il tuo pacchetto?",
    "Il tuo percorso comincia da qui.",
  ];
  const subtitles = [
    "Non devi cambiare tutto in un giorno. Partiamo da te e dalle tue abitudini.",
    "La tua media prima di iniziare: ci aiuterà a dare un valore ai tuoi progressi.",
    "Due dettagli per stimare quanto puoi risparmiare scegliendo di non fumare.",
    "Nessun obiettivo impossibile. Solo la prossima giornata senza fumo.",
  ];
  const monthly = ((daily * Number(price)) / packSize) * 30 * 100;
  useEffect(() => {
    titleRef.current?.focus();
  }, [step]);

  function goTo(next: number) {
    setError("");
    setStep(next);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 1 && (!Number.isInteger(daily) || daily < 1 || daily > 100)) {
      setError("Inserisci un consumo giornaliero tra 1 e 100 sigarette.");
      return;
    }
    const values = {
      cigarettesPerDay: daily,
      packPrice: Number(price),
      packSize,
      timeZone:
        profile?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    if (step >= 2) {
      try {
        parseSettings(values);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Controlla i valori inseriti.",
        );
        return;
      }
    }
    if (step < 3) {
      goTo(step + 1);
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        const result = await saveSettings(values);
        if (result.error) {
          setError(result.error);
          return;
        }
        router.push("/");
        router.refresh();
      } catch {
        setError(
          "Salvataggio non riuscito. Controlla la connessione e riprova.",
        );
      }
    });
  }

  return (
    <div className="wizard-page">
      <header className="wizard-header">
        <Link href="/" className="wizard-brand" aria-label="Quit Smoking">
          <span className="brand-mark">
            <Wind size={22} />
          </span>
          <strong>
            Quit Smoking<span>.</span>
          </strong>
        </Link>
        <AppearanceControls />
      </header>
      <main className="wizard-main">
        <section
          className="wizard-shell"
          aria-label={t("Configura il tuo percorso")}
        >
          <aside
            className={`wizard-visual wizard-visual-step-${step}`}
            aria-hidden="true"
          >
            <div className="wizard-visual-caption">
              <Wind size={17} />
              <span>Quit Smoking</span>
            </div>
            <LungIllustration />
            <div className="wizard-visual-copy">
              <span className="wizard-visual-line" />
              <p>
                {t(
                  step === 0
                    ? "Più spazio per ciò che conta."
                    : step === 3
                      ? "Il primo passo è già un cambiamento."
                      : "Il tuo ritmo. Il tuo nuovo inizio.",
                )}
              </p>
              <small>{t("Un giorno alla volta")}</small>
            </div>
          </aside>
          <form className="wizard-form" onSubmit={submit}>
            <nav
              className="wizard-steps"
              aria-label={t("Passaggi di configurazione")}
            >
              {labels.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={
                    index === step ? "current" : index < step ? "complete" : ""
                  }
                  disabled={pending || index > step}
                  aria-current={index === step ? "step" : undefined}
                  aria-label={t(label)}
                  title={t(label)}
                  onClick={() => goTo(index)}
                >
                  <span>{index < step ? <Check size={12} /> : index + 1}</span>
                  <i />
                </button>
              ))}
            </nav>
            <div className="wizard-stage" key={step}>
              <span className="wizard-step-label">
                {t(labels[step])}
                <span>{step + 1} / 4</span>
              </span>
              <h1 ref={titleRef} tabIndex={-1}>
                {t(titles[step])}
              </h1>
              <p className="wizard-subtitle">{t(subtitles[step])}</p>
              <fieldset disabled={pending} className="wizard-fields">
                {step === 0 ? (
                  <div className="wizard-welcome">
                    <div>
                      <span>
                        <Leaf size={18} />
                      </span>
                      <p>
                        <strong>{t("Giornate senza fumo")}</strong>
                        <small>
                          {t(
                            "Un diario per riconoscere ogni piccolo progresso.",
                          )}
                        </small>
                      </p>
                    </div>
                    <div>
                      <span>
                        <ShieldCheck size={18} />
                      </span>
                      <p>
                        <strong>{t("Il tuo ritmo, nessun giudizio")}</strong>
                        <small>
                          {t(
                            "Puoi sempre correggere una giornata e ricominciare.",
                          )}
                        </small>
                      </p>
                    </div>
                    <p className="wizard-time">
                      {t("Bastano pochi dettagli. Nessun account da creare.")}
                    </p>
                  </div>
                ) : null}
                {step === 1 ? (
                  <div className="wizard-daily">
                    <div className="wizard-dial">
                      <svg viewBox="0 0 220 220" aria-hidden="true">
                        <circle
                          className="dial-track"
                          cx="110"
                          cy="110"
                          r="98"
                        />
                        <circle
                          className="dial-progress"
                          cx="110"
                          cy="110"
                          r="98"
                          pathLength="100"
                          strokeDasharray={`${daily} 100`}
                        />
                      </svg>
                      <div>
                        <label htmlFor="wizard-daily" className="sr-only">
                          {t("Quante sigarette fumi al giorno?")}
                        </label>
                        <input
                          id="wizard-daily"
                          type="number"
                          min="1"
                          max="100"
                          required
                          value={daily || ""}
                          onChange={(event) =>
                            setDaily(Number(event.target.value))
                          }
                        />
                        <span>{t("sigarette / giorno")}</span>
                      </div>
                    </div>
                    <div className="wizard-dial-controls">
                      <button
                        type="button"
                        className="icon-button"
                        disabled={daily <= 1}
                        aria-label={t("Riduci consumo abituale")}
                        onClick={() => setDaily(Math.max(1, daily - 1))}
                      >
                        <Minus size={18} />
                      </button>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={daily || 1}
                        aria-label={t("Consumo abituale giornaliero")}
                        onChange={(event) =>
                          setDaily(Number(event.target.value))
                        }
                      />
                      <button
                        type="button"
                        className="icon-button"
                        disabled={daily >= 100}
                        aria-label={t("Aumenta consumo abituale")}
                        onClick={() => setDaily(Math.min(100, daily + 1))}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    <div className="wizard-presets">
                      {[5, 10, 20].map((value) => (
                        <button
                          type="button"
                          key={value}
                          aria-pressed={daily === value}
                          onClick={() => setDaily(value)}
                        >
                          {value} <span>{t("al giorno")}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {step === 2 ? (
                  <div className="wizard-pack">
                    <div className="field">
                      <label htmlFor="wizard-price">
                        {t("Prezzo del pacchetto")}
                      </label>
                      <div className="input-with-suffix">
                        <input
                          id="wizard-price"
                          type="number"
                          inputMode="decimal"
                          min="0.10"
                          max="100"
                          step="0.01"
                          required
                          value={price}
                          onChange={(event) => setPrice(event.target.value)}
                        />
                        <span>€</span>
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="wizard-pack-size">
                        {t("Sigarette nel pacchetto")}
                      </label>
                      <div className="input-with-suffix">
                        <input
                          id="wizard-pack-size"
                          type="number"
                          inputMode="numeric"
                          min="1"
                          max="100"
                          required
                          value={packSize || ""}
                          onChange={(event) =>
                            setPackSize(Number(event.target.value))
                          }
                        />
                        <span>{t("pz")}</span>
                      </div>
                    </div>
                    <div className="wizard-cost-preview">
                      <span>{t("La tua spesa di riferimento")}</span>
                      <strong>
                        {Number.isFinite(monthly) ? euro(monthly) : "—"}
                        <small>{t("/ mese")}</small>
                      </strong>
                      <p>
                        {t(
                          "Una stima su 30 giorni, basata sulle tue abitudini attuali.",
                        )}
                      </p>
                    </div>
                  </div>
                ) : null}
                {step === 3 ? (
                  <div className="wizard-summary">
                    <div className="wizard-summary-leaf">
                      <Leaf size={26} strokeWidth={1.5} />
                    </div>
                    <dl>
                      <div>
                        <dt>{t("Consumo di partenza")}</dt>
                        <dd>
                          {daily} {t("sigarette / giorno")}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("Prezzo del pacchetto")}</dt>
                        <dd>{euro(Number(price) * 100)}</dd>
                      </div>
                      <div>
                        <dt>{t("Sigarette nel pacchetto")}</dt>
                        <dd>{packSize}</dd>
                      </div>
                    </dl>
                    <div className="wizard-summary-saving">
                      <span>{t("Ogni mese senza fumo può valere")}</span>
                      <strong>{euro(monthly)}</strong>
                      <small>
                        {t(
                          "Risparmio stimato rispetto alle tue abitudini iniziali.",
                        )}
                      </small>
                    </div>
                    <p className="wizard-summary-note">
                      <Check size={16} />
                      <span>
                        {t(
                          "Conferma le giornate senza fumo nel diario. Al resto, un passo alla volta.",
                        )}
                      </span>
                    </p>
                  </div>
                ) : null}
              </fieldset>
            </div>
            {error ? (
              <p className="wizard-error" role="alert">
                {t(error)}
              </p>
            ) : null}
            <div className="wizard-actions">
              {step > 0 ? (
                <button
                  type="button"
                  className="wizard-back"
                  disabled={pending}
                  onClick={() => goTo(step - 1)}
                >
                  <ArrowLeft size={16} />
                  {t("Indietro")}
                </button>
              ) : (
                <Link href="/" className="wizard-back">
                  {t("Torna alla panoramica")}
                </Link>
              )}
              <button className="wizard-next" type="submit" disabled={pending}>
                {pending
                  ? t("Salvataggio…")
                  : step === 3
                    ? profile
                      ? t("Salva e torna alla panoramica")
                      : t("Inizia il mio percorso")
                    : t("Continua")}
                <ArrowRight size={17} />
              </button>
            </div>
            <p className="wizard-privacy">
              <ShieldCheck size={12} />
              {t("Le tue abitudini restano nel tuo diario personale.")}
            </p>
          </form>
        </section>
      </main>
      <footer className="wizard-footer">
        <span>{t("Meno fumo. Più spazio per te.")}</span>
        <span>{t("Fatto di piccoli passi")}</span>
      </footer>
    </div>
  );
}

function LungIllustration() {
  // Decorative vector artwork: no external assets or health claims.
  return (
    <svg
      className="wizard-lungs"
      viewBox="0 0 460 560"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="lung-fill"
          x1="80"
          y1="80"
          x2="390"
          y2="450"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ffb28c" />
          <stop offset="1" stopColor="#ee654e" />
        </linearGradient>
      </defs>
      <path
        d="M202 112c-12-38-38-49-64-25C75 146 33 239 33 356c0 91 28 119 82 101l73-25c24-9 31-24 27-51l-9-122c-2-39 9-112-4-147Z"
        fill="url(#lung-fill)"
      />
      <path
        d="M258 112c12-38 38-49 64-25 63 59 105 152 105 269 0 91-28 119-82 101l-73-25c-24-9-31-24-27-51l9-122c2-39-9-112 4-147Z"
        fill="url(#lung-fill)"
      />
      <path
        d="M230 74v115c0 38-31 52-65 83M230 189c0 38 31 52 65 83"
        stroke="#c94e3c"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <g
        stroke="#cf5340"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m170 268-33 49-20 72m34-97-49-30-20-39m55 94-58 25m39 46-47 25m94-142-5-68-22-46m22 82 29-34m-47 99 35 50 8 60m-44-17 32 19m-32-61-32 13" />
        <path d="m290 268 33 49 20 72m-34-97 49-30 20-39m-55 94 58 25m-39 46 47 25m-94-142 5-68 22-46m-22 82-29-34m47 99-35 50-8 60m44-17-32 19m32-61 32 13" />
      </g>
      <g stroke="#f8c09d" strokeWidth="1.5" opacity=".6">
        <path d="m100 180-20 45m45-18-21 53m67 102-22 39m-62-74-20 36m293-183 20 45m-45-18 21 53m-67 102 22 39m62-74 20 36" />
      </g>
    </svg>
  );
}
