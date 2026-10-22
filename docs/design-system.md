# Quit Smoking · Design system

La reference definisce la direzione: uno spazio di lavoro compatto, sidebar chiara, pannelli bianchi incorniciati nel grigio caldo, un solo pannello carbone. Il calendario a celle è il centro del prodotto.

## Token

- Canvas: #e4e4e1; shell: #f5f5f2; superficie: #ffffff.
- Testo: #252622; secondario: #70716a; bordo: #e5e5df.
- Azione primaria: #292b26; progresso: #37664b; errore: #a8382e.
- Font: Helvetica Neue / Arial per interfaccia; sistema monospace per date e metadati.
- Spaziatura: 4, 8, 12, 16, 20, 24, 32, 40 px.
- Raggi: 6 px input/celle; 9 px pulsanti; 12 px card; 20 px shell.
- Bordo 1 px; ombra leggera solo per superfici interattive e card annidate.

## Struttura

Sidebar da 216 px; barra contestuale; contenuto allineato a sinistra. Desktop: pannello scuro orizzontale, quattro statistiche e calendario con colonna diario. Mobile: barra compatta, statistiche 2×2, calendario e diario impilati.

## Componenti

Brand, navigazione, pulsante primario/secondario/icona, input con suffisso, card statistica, pannello scuro, badge di stato, contribution grid, pannello giornata, dialog impostazioni, messaggio di stato/errore.

## Calendario

26 o 53 settimane, lunedì–domenica. Nessuna registrazione = cella neutra; registrazione aperta = cella con puntino; confermata sopra la media = grigio; riduzione = verde con intensità crescente; zero = verde scuro. Celle future o precedenti all'inizio disabilitate. Ogni cella ha un'etichetta testuale e la selezione apre un dettaglio utilizzabile anche senza hover.

## Principi

Dati reali, stati vuoti espliciti, nessun progresso inventato. Il colore indica un dato, mai un giudizio. Nessuna affermazione medica. Stime economiche in euro, quantità e prezzo fotografati in ogni giornata; i giorni non confermati non contribuiscono ai risultati. Focus visibile, dialog nativo, etichette, feedback di salvataggio, motion ridotto.

## Layout applicativo e preferenze

L'app occupa l'intera finestra, senza cornice esterna o larghezza massima. La sidebar desktop è larga 240 px e può diventare un rail da 76 px; su mobile si apre come drawer con backdrop e navigazione da tastiera. Panoramica (`/`), diario (`/diario`) e impostazioni (`/impostazioni`) sono pagine distinte.

I controlli in alto a destra permettono di scegliere tema chiaro/scuro e lingua italiano/inglese. Le preferenze sono conservate in `localStorage`, condivise tra le pagine e sincronizzate tra schede. Il tema scuro usa superfici verdi e carbone, testo chiaro e una scala di progresso dedicata; la valuta resta EUR in entrambe le lingue. Date, etichette, messaggi, modali e calendario sono localizzati.

## Inizio del calendario e reset

La griglia si sviluppa dalla prima giornata registrata verso i mesi successivi. Un diario vuoto parte da oggi. L’allineamento rimane lunedì–domenica, ma le celle precedenti alla prima registrazione sono invisibili. Lo scorrimento mantiene visibile la selezione senza spostarsi automaticamente alla fine dei mesi futuri.

Il reset si trova nelle impostazioni: un dialog esplicita i dati eliminati e offre Annulla / Azzera e ricomincia. Durante la richiesta i controlli sono disabilitati; in caso di errore il dialog rimane aperto. Abitudini, tema e lingua vengono mantenuti.
