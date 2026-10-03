# ~/pomo_rv (Focus App) — Documento di progetto

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
- Pannello laterale (cassetto da destra, non sposta il kanban) per creare/eliminare tag e mostrare solo le task con certi tag. I pannelli laterali si chiudono anche con un clic fuori
- Le task e i tag restano salvati anche chiudendo il browser

### Pomodoro timer
- Avvio, pausa e reset
- Cicli automatici: lavoro → pausa breve → … → pausa lunga ogni N cicli
- Durate personalizzabili (cursore 1–90 minuti + campo numerico) in un pannello laterale aperto dal pulsante ⋯, nei colori "pomodoro": lavoro, pausa breve, pausa lunga, cicli prima della pausa lunga. Le modifiche valgono solo premendo **Salva** (che resetta il timer); chiudendo il pannello si scartano
- Preimpostazioni delle durate: una di fabbrica ("Classico" 25/5/15/4) e quelle create dall'utente (con nome), caricabili con un clic ed eliminabili
- Suono (generato con Web Audio, niente file) e notifica del browser a fine fase, con un campanello diverso per fine lavoro e fine pausa. Interruttore suono nell'intestazione (scelta ricordata); la notifica compare solo se la scheda non è in primo piano

### Reward system
- Task: i punti li sceglie l'utente per ogni task con uno slider nel menu ⋯ (valori +5, +10, +15, +25, +50, +75, +100; default +10, mostrati anche accanto alla task). Si ottengono una sola volta, quando la task entra in Completate: riportarla indietro e rimetterla non dà altri punti, e l'etichetta dei punti appare oscurata e barrata. Cambiando il valore con lo slider i punti tornano ottenibili
- Pomodoro: **1 punto per ogni minuto** di lavoro, assegnato quando il timer finisce da solo (le pause e il tasto Salta non danno nulla)
- Nell'intestazione: punti, livello (uno ogni 100 punti) e barra di avanzamento; "+N" che sale a ogni premio. Anche la task appena completata si anima, partendo dall'etichetta dei punti: etichetta che si ingrandisce, lampo del bordo e scintille (niente numero che sale), più un "ding". L'effetto è **proporzionale ai punti** (+5 leggero, senza scintille; +100 esagerato: alone, ingrandimento e durata maggiori, 12 scintille)
- Suoni (tutti sintetizzati, spegnibili con il pulsante audio): "ding" per la task completata, uno grave e morbido per lo spostamento di colonna, uno per task aggiunta e uno per task eliminata, uno per "Salta", vibrazione e ritorno in To-do delle task ripetibili, avvio/pausa/reset del timer, campanelli di fine fase. L'audio si sblocca al primo clic o tasto premuto sulla pagina (i browser lo richiedono)
- Task **ripetibile** (interruttore nel menu ⋯, segnalata da ↻ accanto ai punti): completata, dopo l'animazione vibra e torna in fondo a To-do, dove può dare di nuovo i punti (succede ogni volta che entra in Completate, anche se i punti erano già stati incassati)
- Pulsante ✕ sulla task (a destra dei tre puntini) per eliminarla; diventa rosso al passaggio del mouse
- Pulsante impostazioni (ingranaggio) nell'intestazione: pannello laterale con aggiunta/rimozione di punti e reset di livello e punti, per testare il sistema
- Salvati nel browser (`rewards`)

### Generale
- Pagina unica: in alto timer (quadrante scuro con anello che si svuota) e accanto la scena ASCII del viaggio; sotto il kanban a tutta larghezza. Su schermi stretti tutto in colonna
- Scena ASCII art accanto al timer (nel viaggio il camper resta fermo, un po' a sinistra, e la strada scorre, con paletti, mezzeria, erba e punte di pini in primo piano; la strada si colora da sinistra a destra con il progresso del pomodoro, da 0% a 100%), direttamente sullo sfondo della pagina (senza pannello), con un colore base (viola scuro nel tema chiaro, verde nel tema scuro) e l'ambra solo per pochi elementi: nel viaggio il camper con il suo fumo, il sole e la strada già percorsa; nel campeggio falò (con il fumo), camper e stelle. Il campeggio ha la stessa linea d'orizzonte con i paletti e la stessa erba del viaggio. Le montagne sono le stesse nelle due scene (cime separate, senza linea d'orizzonte). Strada e orizzonte sono alla stessa altezza nelle due scene, con spazio vuoto in mezzo che stacca lo sfondo (montagne) dal primo piano: durante il lavoro un camper (stile cartoon) è in viaggio; durante le pause il camper è parcheggiato in campeggio, con montagne, falò e cielo stellato. La scena si anima solo mentre il timer corre: in pausa si ferma esattamente dov'è
- Menu della task con "Sposta in…" come alternativa al drag & drop (tastiera e touch)
- Tema chiaro / scuro selezionabile con un interruttore (la scelta viene ricordata)
- Estetica "terminale / Hyprland": font JetBrains Mono + Press Start 2P (titolo e cifre del timer), finestre con bordo a gradiente quando sono attive, anello del timer a segmenti. Tema chiaro: bianco + viola (pause in ambra). Tema scuro: nero/grigio + verde fosforo (pause in ambra)
- Titolo "~/pomo_rv" (come un prompt di terminale) con sottotitolo "Pomodoro e task per restare in carreggiata, un pit stop alla volta."
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
│   ├── journey.js     ← scena ASCII del camper (viaggio e campeggio)
│   ├── sound.js       ← suoni e notifiche di fine fase
│   ├── rewards.js     ← punti e livelli
│   ├── settings.js    ← pannello impostazioni (test dei punti)
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
- [x] 6. **Pomodoro base** — start/pausa/reset/salta e cicli automatici
- [x] 7. **Impostazioni Pomodoro** — durate e numero di cicli personalizzabili, salvati nel browser
- [x] 8. **Suono e notifiche**
- [x] 8b. **Reward system** — punti per task e pomodori, livelli
- [ ] 9. **Rifinitura** — tempo nel titolo della scheda, accessibilità, pulizia

## Note e limiti noti
- Il drag & drop del browser (HTML5) funziona con il mouse; sui touchscreen (telefono/tablet) non è affidabile. Per ora l'app è pensata per il computer. Se servirà su telefono, aggiungeremo un'alternativa (es. menu "Sposta in…").
- Quando verrà fatto il reward system, il timer potrà spostare automaticamente le task in "Completate".

## Idee per il futuro (non incluse ora)
- **Colonne personalizzabili** nel kanban
- **Reward**: badge, negozio di ricompense da spendere con i punti, cronologia
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
