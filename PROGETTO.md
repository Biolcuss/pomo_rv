# Focus App — Documento di progetto

> Questo file raccoglie le decisioni prese, lo stato di avanzamento e le idee per il futuro.
> Viene aggiornato al termine di ogni tappa.

## Obiettivo
Una web app personale per aiutare la produttività, che combina una **to-do list** e un **Pomodoro timer**.
La prima versione funziona **solo in locale** (sul proprio computer, nel browser).

## Funzionalità della versione 1

### To-do list (struttura kanban)
- Tre colonne **fisse**: To-do, In corso, Completate
- Le task si spostano tra le colonne (e si riordinano dentro la colonna) con il **drag & drop**
- Una task è "completata" solo se trascinata nella colonna Completate (niente casella da spuntare)
- Le task si aggiungono direttamente nelle colonne, con il pulsante "+ Aggiungi task" in cima a ciascuna
- Ogni task ha un menu a tre puntini (⋯) con: Modifica, Tag, Elimina
- Le colonne hanno un'altezza minima, così restano ampie anche se vuote
- Aggiungere, modificare ed eliminare task
- **Tag** personalizzabili e colorati (es. lavoro, casa, urgente, 5 minuti): una task può averne più di uno
- Colori dei tag scelti da una palette di 9 colori; la colonna Completate è visivamente "oscurata" (anche nel tema scuro)
- Pannello laterale (cassetto da destra, non sposta il kanban) per creare/eliminare tag e mostrare solo le task con certi tag
- Le task e i tag restano salvati anche chiudendo il browser

### Pomodoro timer
- Avvio, pausa e reset
- Cicli automatici: lavoro → pausa breve → … → pausa lunga ogni N cicli
- Durate personalizzabili: lavoro, pausa breve, pausa lunga, numero di cicli prima della pausa lunga
- Suono e notifica del browser a fine sessione

### Generale
- Pagina unica: timer in alto (card compatta), kanban sotto a tutta larghezza (colonne impilate su schermi piccoli)
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
│   ├── todo.js        ← logica del kanban e delle task
│   ├── tags.js        ← tag colorati e pannello filtri
│   ├── timer.js       ← logica del Pomodoro timer
│   ├── theme.js       ← interruttore tema chiaro/scuro
│   └── main.js        ← avvio dell'app, collega tutti i pezzi
└── assets/sounds/     ← eventuali suoni
```

## Tappe di sviluppo
Ogni tappa: spiegazione dei concetti → codice → prova nel browser → commit Git.

- [x] 1. **Setup** — Git, documenti di progetto, Live Server
- [x] 2. **Scheletro della pagina** — HTML e layout CSS
- [x] 3. **Tema chiaro/scuro**
- [x] 4. **To-do base** — aggiungi, completa, modifica, elimina, salvataggio
- [x] 5. **Kanban** — tre colonne con drag & drop
- [x] 5b. **Tag e filtri** — tag colorati, più tag per task, pannello filtri richiudibile
- [ ] 6. **Pomodoro base** — start/pausa/reset e cicli
- [ ] 7. **Impostazioni Pomodoro** — durate personalizzabili
- [ ] 8. **Suono e notifiche**
- [ ] 9. **Rifinitura** — tempo nel titolo della scheda, accessibilità, pulizia

## Note e limiti noti
- Il drag & drop del browser (HTML5) funziona con il mouse; sui touchscreen (telefono/tablet) non è affidabile. Per ora l'app è pensata per il computer. Se servirà su telefono, aggiungeremo un'alternativa (es. menu "Sposta in…").
- Quando verrà fatto il reward system, il timer potrà spostare automaticamente le task in "Completate".

## Idee per il futuro (non incluse ora)
- **Colonne personalizzabili** nel kanban
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
