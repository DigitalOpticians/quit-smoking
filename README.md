# Quit Smoking

Base del progetto con Next.js 16, React 19, TypeScript, App Router, Tailwind CSS e SQLite tramite Drizzle ORM e `better-sqlite3`.

## Avvio locale

Usare Node.js 24 (vedi `.nvmrc`) e npm.

```sh
npm ci
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Aprire [localhost:3000](http://localhost:3000).

`DATABASE_PATH` indica un percorso locale, relativo alla radice del progetto oppure assoluto. Il valore di esempio crea `data/quit-smoking.sqlite`; cartella e file vengono creati automaticamente. Non servono credenziali per SQLite.

## Database

- `src/db/schema.ts`: schema versionato; include una tabella iniziale `app_settings`, senza dati personali.
- `src/db/index.ts`: connessione riservata al server, aperta su richiesta e riutilizzata durante gli hot reload.
- `drizzle/`: migrazioni SQL e metadati da includere nella repo.
- `drizzle.config.ts`: configurazione CLI; carica gli stessi file di ambiente di Next.js.

Dopo una modifica allo schema:

```sh
npm run db:generate
npm run db:migrate
```

Per esplorare il database locale: `npm run db:studio`.

Nei Server Components, Server Actions o Route Handlers con runtime Node.js:

```ts
import { getDb } from "@/db";
import { appSettings } from "@/db/schema";

const settings = getDb().select().from(appSettings).all();
```

Applicare le migrazioni prima di avviare l'app. Per letture aggiornate dal database in una pagina, usare il rendering dinamico di Next.js (`await connection()` da `next/server`) oppure una strategia esplicita di cache e invalidazione.

SQLite richiede un filesystem scrivibile e persistente anche in produzione. Il file locale non è adatto allo storage effimero delle funzioni serverless; scegliere un host con disco persistente o adattare il database prima del deploy. Il driver usa il runtime Node.js.

## Repository pubblica

`.env.example` contiene solo configurazione dimostrativa ed è versionabile. `.env`, `.env.local` e le altre varianti, database SQLite e relativi journal/backup, `data/`, credenziali locali, dipendenze e output di build sono esclusi da Git.

- Conservare chiavi e credenziali nei file di ambiente ignorati o nel gestore dei segreti dell'hosting.
- Le variabili `NEXT_PUBLIC_*` sono visibili al browser: usarle solo per valori pubblici.
- Versionare `package-lock.json`, schema e migrazioni; non aggiungere dati reali a migrazioni, seed o file di esempio.
- Controllare `git status` e `git diff --cached` prima di pubblicare. `.gitignore` non rimuove file già tracciati: se un segreto viene pubblicato, occorre revocarlo e rimuoverlo anche dalla cronologia.

Il collegamento a GitHub resta da configurare.

## Comandi

```sh
npm run dev        # sviluppo
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run build      # build di produzione
npm run start      # avvio della build di produzione
```

Build verificata anche con `npm run build -- --webpack`. In ambienti che impediscono a Turbopack di aprire porte locali durante la compilazione, usare questa variante.

## Dipendenze

Verificare gli aggiornamenti con `npm audit` e `npm audit --omit=dev`. Al momento della configurazione, il controllo di produzione rileva zero vulnerabilità; npm segnala 9 avvisi nelle dipendenze di sviluppo di ESLint/Next e Drizzle Kit (5 alti e 4 moderati). Evitare `npm audit fix --force` senza verificare la compatibilità: le correzioni proposte includono downgrade incompatibili.

Documentazione: [Next.js](https://nextjs.org/docs), [Drizzle e SQLite](https://orm.drizzle.team/docs/get-started/sqlite-new).

## Tracker

Le prime impostazioni raccolgono il consumo medio giornaliero, il prezzo del pacchetto e il numero di sigarette nel pacchetto (20 come valore iniziale). Il fuso orario del browser viene salvato all'avvio del percorso.

La dashboard include:

- Registrazione rapida di una sigaretta e annullamento del conteggio di oggi.
- Conferma del totale giornaliero, incluso zero; modifica delle giornate dal calendario.
- Calendario a celle da 6 mesi o un anno, con selezione tramite mouse, touch o frecce della tastiera.
- Risparmio stimato, sigarette evitate, giorni senza fumo, serie consecutiva e riepilogo settimanale.
- Modifica delle abitudini senza ricalcolare le giornate già registrate.

Una giornata non registrata o non confermata non conta come giornata senza fumo. Il risparmio usa il confronto con la media abituale e include soltanto le giornate confermate; i giorni oltre la media riducono il saldo. Ogni giornata conserva consumo medio e prezzo di riferimento originali. Le settimane nel calendario iniziano di lunedì.

### Profili del prototipo

`profiles` e `daily_logs` persistono in SQLite. Il profilo è associato a un token casuale in un cookie HttpOnly, SameSite=Lax, con durata di un anno; il database conserva solo l'hash del token. Ogni lettura e scrittura è limitata al profilo associato al cookie. Nessuna identità del profilo viene accettata dal client per accedere a dati altrui.

Il prototipo non include account o recupero del profilo: cancellare il cookie o cambiare browser fa perdere l'accesso al diario precedente. Il database rimane comunque sul server. Per un prodotto pubblico con accesso da più dispositivi, aggiungere un sistema di autenticazione e recupero. In produzione il cookie usa il flag Secure e richiede HTTPS.

### Design e verifiche

Token e componenti sono descritti in [docs/design-system.md](docs/design-system.md). L'interfaccia riprende la reference fornita: grigio caldo, superfici bianche, pannello carbone e verde per il progresso confermato. Non usa immagini o font remoti.

```sh
npm run test
npm run lint
npm run typecheck
npm run build -- --webpack
```

I test coprono calcoli, serie, dati mancanti, snapshot dei prezzi, date e ora legale, validazione e migrazioni SQLite in un database temporaneo. Il database `data/preview.sqlite`, quando presente, contiene soltanto dati sintetici per la verifica visuale ed è escluso da Git come tutti i file in `data/`.

## Tema e lingua

La barra superiore include il cambio tema chiaro/scuro e il selettore Italiano/English. Le preferenze sono salvate nel browser e si applicano a tutte le pagine. La lingua cambia testi, messaggi, date e formati monetari; la valuta resta euro. Le traduzioni sono raccolte in `src/lib/translations.ts` e i token scuri in `src/app/globals.css`.

Per il workflow concordato, eseguire soltanto `npm run typecheck` durante le modifiche; build e verifiche funzionali vengono richieste separatamente dall’utente.

## Ripartire da oggi

In Impostazioni, “Azzera il diario” apre una conferma prima di eliminare le registrazioni del solo profilo corrente. Il reset azzera statistiche e serie e aggiorna la data di inizio a oggi; mantiene abitudini, cookie, tema e lingua. Non è annullabile.

Il calendario parte dalla prima registrazione effettiva, oppure da oggi se è vuoto, e si estende in avanti per il periodo selezionato. Le celle di allineamento precedenti alla prima registrazione sono nascoste. I giorni futuri restano disabilitati; quando il periodo iniziale è trascorso, la finestra scorre per includere la settimana corrente.
