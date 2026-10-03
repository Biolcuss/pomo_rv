# Focus App — Documento di progetto

> Questo file raccoglie le decisioni prese, lo stato di avanzamento e le idee per il futuro.
> Viene aggiornato al termine di ogni tappa.

## Obiettivo
Una web app personale per aiutare la produttività, che combina una **to-do list** e un **Pomodoro timer**.
La prima versione funziona **solo in locale** (sul proprio computer, nel browser).

## Funzionalità della versione 1

### To-do list
- Aggiungere, modificare, eliminare e segnare come completata una task
- Filtri: tutte / da fare / completate
- Riordino delle task trascinandole (drag & drop)
- Le task restano salvate anche chiudendo il browser

### Pomodoro timer
- Avvio, pausa e reset
- Cicli automatici: lavoro → pausa breve → … → pausa lunga ogni N cicli
- Durate personalizzabili: lavoro, pausa breve, pausa lunga, numero di cicli prima della pausa lunga
- Suono e notifica del browser a fine sessione

### Generale
- Pagina unica: to-do list e timer affiancati (uno sotto l'altro su schermi piccoli)
- Tema chiaro / scuro selezionabile con un interruttore (la scelta viene ricordata)
- Interfaccia in italiano

## Decisioni tecniche (e perché)

| Decisione | Scelta | Motivo |
|---|---|---|
| Tecnologia | HTML + CSS + JavaScript "puro" | Sono le basi di ogni sito web: niente da installare, ottimo per imparare. In futuro si può passare a un framework (es. React). |
| Salvataggio dati | `localStorage` del browser | Semplice e senza server. Limite: i dati restano solo su quel browser di quel computer. |
| Organizzazione codice | Un file JavaScript per ogni funzionalità (moduli) | Codice ordinato; aggiungere nuove funzioni (es. rewards) significa aggiungere un file, non riscrivere tutto. |
| Nomi nel codice | Variabili e funzioni in inglese, commenti in italiano | È la prassi comune nello sviluppo software. |
| Server locale | Estensione VS Code **Live Server** | I moduli JavaScript non funzionano aprendo il file con doppio clic; serve un piccolo server locale. Bonus: ricarica la pagina da solo a ogni modifica. |
| Cronologia | Git, un commit per ogni tappa | Permette di tornare indietro se qualcosa si rompe ed è necessario per pubblicare online in futuro. |

## Struttura dei file
```
Focus App/
├── PROGETTO.md        ← questo documento
├── README.md          ← istruzioni per aprire l'app
├── index.html         ← struttura della pagina (cosa c'è)
├── css/style.css      ← aspetto grafico (come appare)
├── js/
│   ├── storage.js     ← lettura/scrittura dati nel browser
│   ├── todo.js        ← logica della to-do list
│   ├── timer.js       ← logica del Pomodoro timer
│   ├── theme.js       ← interruttore tema chiaro/scuro
│   └── main.js        ← avvio dell'app, collega tutti i pezzi
└── assets/sounds/     ← eventuali suoni
```

## Tappe di sviluppo
Ogni tappa: spiegazione dei concetti → codice → prova nel browser → commit Git.

- [x] 1. **Setup** — Git, documenti di progetto, Live Server
- [x] 2. **Scheletro della pagina** — HTML e layout CSS
- [ ] 3. **Tema chiaro/scuro**
- [ ] 4. **To-do base** — aggiungi, completa, modifica, elimina, salvataggio
- [ ] 5. **To-do avanzata** — filtri e drag & drop
- [ ] 6. **Pomodoro base** — start/pausa/reset e cicli
- [ ] 7. **Impostazioni Pomodoro** — durate personalizzabili
- [ ] 8. **Suono e notifiche**
- [ ] 9. **Rifinitura** — tempo nel titolo della scheda, accessibilità, pulizia

## Idee per il futuro (non incluse ora)
- **Reward system**: punti/badge quando si completa una task o si rispetta il timer
- **Animazione del timer**: anello circolare che si svuota con il tempo
- **Statistiche**: pomodori completati oggi / in totale
- **Pubblicazione online**: GitHub Pages o Netlify (gratuiti per siti come questo)
- **Sincronizzazione tra dispositivi**: richiederebbe un server e un database

## Glossario
- **HTML** — descrive *cosa* c'è nella pagina (titoli, pulsanti, liste).
- **CSS** — descrive *come appare* (colori, dimensioni, posizioni).
- **JavaScript (JS)** — descrive *cosa succede* (cliccando un pulsante, allo scadere del timer…).
- **DOM** — la rappresentazione della pagina che JavaScript può leggere e modificare.
- **localStorage** — piccolo "archivio" del browser dove salvare dati in modo permanente.
- **Modulo** — un file JavaScript che esporta funzioni utilizzabili da altri file.
- **Server locale** — programma che "serve" i file del progetto al browser, come farebbe un sito vero.
- **Git** — strumento che registra la cronologia delle modifiche al progetto.
- **Repository** — la cartella del progetto tracciata da Git.
- **Commit** — una "fotografia" salvata del progetto in un certo momento, con una descrizione.
