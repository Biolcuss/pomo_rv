// Scena in ASCII art accanto al timer: un camper in viaggio.
// - Lavoro: il camper è fermo (un po' a sinistra) e la strada scorre, così sembra in viaggio;
//   la strada si colora da sinistra a destra con il progresso del pomodoro (0% → 100%).
// - Pausa: il camper è parcheggiato in campeggio, con montagne, falò e stelle.
//
// Come funziona il disegno: una "tela" è una griglia di celle { ch, cls } (carattere + colore).
// Gli sprite (piccoli disegni fatti di righe di testo) vengono "timbrati" sulla tela,
// poi la tela diventa HTML: ogni gruppo di celle dello stesso colore è uno <span>.

const W = 64;   // colonne
const H = 20;   // righe
const HORIZON_ROW = 10;   // riga dove finiscono le montagne in lontananza
const ROAD_ROW = 17;      // riga della strada (bordo vicino) sotto le ruote del camper
// Orizzonte e strada sono uguali nella scena di viaggio e in quella del campeggio:
// il camper resta sempre alla stessa altezza. Tra orizzonte e primo piano c'è spazio vuoto,
// così lo sfondo si stacca.
const CAMPER_Y = ROAD_ROW - 3;
const CAMPER_X = 16;   // posizione del camper nel viaggio: un po' a sinistra del centro

const artEl = document.getElementById('scene-art');
const sceneEl = document.getElementById('scene-section');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let state = { mode: 'work', progress: 0, running: false };
let frame = 0;

// ---------- Sprite ----------
// "W" nelle ruote viene sostituito dal carattere del fotogramma (la ruota gira).
const CAMPER = [
  " .-------.__",
  " | [] [] | '.",
  " '-(W)--(W)-'",
];
const CAMPER_W = Math.max(...CAMPER.map((line) => line.length));
const WHEEL_FRAMES = ['-', '\\', '|', '/'];
const EXHAUST_FRAMES = ['   ', '.  ', 'o. ', ' o.'];

const SUN = [
  ' \\ | / ',
  '-- O --',
  ' / | \\ ',
];
const CLOUD = [
  '  .--.  ',
  '.(    ).',
  '(___.__)',
];
// Punte dei pini in primo piano: passano davanti alla strada e coprono al massimo le ruote
const FG_TREE = [
  '   ^   ',
  '  /^\\  ',
  ' /^^^\\ ',
  '/^^^^^\\',
];
const FG_TREE_SMALL = [
  '  ^  ',
  ' /^\\ ',
  '/^^^\\',
];
// Posizione di partenza di ogni pino lungo un "giro" di FG_PERIOD colonne:
// il giro è più largo della scena, così ogni tanto non passa nessun albero.
const FG_PERIOD = W + 30;
const FG_TREES = [
  { x: 10, sprite: FG_TREE },
  { x: 18, sprite: FG_TREE_SMALL },
  { x: 60, sprite: FG_TREE },
];

// Montagne: la stessa catena in entrambe le scene. Ogni cima è un triangolo di / e \
// (c = colonna del lato sinistro della punta, h = altezza in righe). Le cime si toccano
// solo alla base formando una valle "\/", senza cime piccole dentro quelle grandi
// e senza una riga di base che faccia da orizzonte.
const MOUNTAIN_ROWS = 5;
const PEAKS = [
  { c: 6, h: 3 }, { c: 14, h: 5 }, { c: 23, h: 4 }, { c: 32, h: 5 },
  { c: 40, h: 3 }, { c: 48, h: 5 }, { c: 57, h: 4 },
];

function buildMountains() {
  const rows = Array.from({ length: MOUNTAIN_ROWS }, () => Array(W).fill(' '));
  for (const { c, h } of PEAKS) {
    for (let k = 0; k < h; k++) {
      const row = MOUNTAIN_ROWS - h + k;
      rows[row][c - k] = '/';
      rows[row][c + 1 + k] = '\\';
    }
  }
  return rows.map((row) => row.join(''));
}

const MOUNTAINS = buildMountains();
const PINE = [
  '  ^  ',
  ' /^\\ ',
  '/^^^\\',
  '  |  ',
];
const TENT = [
  '   /\\   ',
  '  /  \\  ',
  ' /_/\\_\\ ',
];
const FIRE_FRAMES = [
  ['  (  ', ' ) ) ', '( ( )'],
  ['  )  ', ' ( ( ', '( ) )'],
  [' (   ', '  ) )', '( ( )'],
];
const LOGS = [' =#= '];
const SMOKE_FRAMES = [
  ['  .', ' o ', '.  '],
  ['o  ', '  .', ' o '],
  [' . ', 'o  ', '  o'],
];
const STARS = [[3, 0], [11, 1], [19, 0], [31, 0], [38, 2], [45, 0], [61, 1], [7, 3], [29, 2], [52, 2], [16, 2], [58, 3], [41, 1], [25, 0]];
const STAR_FRAMES = ['*', '+', '.', '*'];

// ---------- Tela ----------

function createCanvas() {
  return Array.from({ length: H }, () => Array.from({ length: W }, () => ({ ch: ' ', cls: '' })));
}

// Timbra uno sprite. Gli spazi ai bordi di ogni riga sono trasparenti;
// con `opaque` gli spazi interni coprono quello che c'è dietro (es. la carrozzeria del camper).
function stamp(canvas, sprite, x, y, cls, opaque = false) {
  sprite.forEach((line, dy) => {
    const first = line.search(/\S/);
    const last = line.length - 1 - [...line].reverse().join('').search(/\S/);
    [...line].forEach((ch, dx) => {
      const inside = first !== -1 && dx >= first && dx <= last;
      if (ch === ' ' && !(opaque && inside)) return;
      const cell = canvas[y + dy]?.[x + dx];
      if (cell) {
        cell.ch = ch;
        cell.cls = cls;
      }
    });
  });
}

function escape(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toHTML(canvas) {
  return canvas.map((row) => {
    let html = '';
    let run = '';
    let runCls = row[0].cls;
    for (const cell of row) {
      if (cell.cls !== runCls) {
        html += runCls ? `<span class="${runCls}">${escape(run)}</span>` : escape(run);
        run = '';
        runCls = cell.cls;
      }
      run += cell.ch;
    }
    html += runCls ? `<span class="${runCls}">${escape(run)}</span>` : escape(run);
    return html;
  }).join('\n');
}

// ---------- Le due scene ----------
// Tutto ciò che si muove dipende da `frame`, che avanza solo mentre il timer corre:
// mettendo in pausa la scena si congela esattamente dov'è, senza tornare indietro.

function camperSprite(wheel) {
  return CAMPER.map((line) => line.replaceAll('W', wheel));
}

// Colori: tutta la scena ha il colore base del tema; l'ambra (c-amb) serve solo a staccare
// pochi elementi: nel viaggio il camper, il suo fumo, il sole e la strada già percorsa;
// nel campeggio il falò (con il suo fumo), il camper e le stelle.

// Elementi di sfondo e primo piano uguali nelle due scene (così restano coerenti).
// `shift` li fa scorrere nel viaggio; nel campeggio è 0 e stanno fermi.

// Bordo lontano della carreggiata: linea con i paletti, all'altezza ROAD_ROW - 4
function farEdgeLine(shift) {
  return Array.from({ length: W }, (_, i) => ((i + shift) % 12 === 0 ? '|' : '_')).join('');
}

// Erba in primo piano, sotto la strada (due righe)
function drawGrass(canvas, shift) {
  const rows = [
    (i) => ".,'"[mod((i + shift) * 7, 3)],
    (i) => " ,'."[mod((i + shift) * 5, 4)],
  ];
  rows.forEach((pick, index) => {
    stamp(canvas, [Array.from({ length: W }, (_, i) => pick(i)).join('')], 0, ROAD_ROW + 1 + index, 'c-dim');
  });
}

// Lavoro: il camper è fermo (un po' a sinistra), è la strada a scorrere. La strada si colora
// d'ambra da sinistra a destra con il progresso del pomodoro: all'avvio 0%, a fine pomodoro tutta colorata.
function drawRoad(canvas) {
  stamp(canvas, SUN, W - 9, 1, 'c-amb');
  // Le nuvole scorrono piano (sono lontane); la strada e gli alberi in primo piano più veloci
  const cloudShift = Math.floor(frame / 2);
  stamp(canvas, CLOUD, mod(8 - cloudShift, W + 8) - 8, 0, 'c-mut');
  stamp(canvas, CLOUD, mod(36 - cloudShift, W + 8) - 8, 1, 'c-mut');
  stamp(canvas, MOUNTAINS, 0, HORIZON_ROW - MOUNTAIN_ROWS + 1, 'c-dim');

  // Carreggiata: bordo lontano con i paletti, linea di mezzeria, bordo vicino
  const centerLine = Array.from({ length: W }, (_, i) => ((i + frame) % 4 < 2 ? '-' : ' ')).join('');
  const roadRows = [[farEdgeLine(frame), ROAD_ROW - 4], [centerLine, ROAD_ROW - 2], ['='.repeat(W), ROAD_ROW]];
  const done = Math.round(state.progress * W);   // colonne già "percorse"
  for (const [line, row] of roadRows) {
    stamp(canvas, [line], 0, row, 'c-mut');
    stamp(canvas, [line.slice(0, done)], 0, row, 'c-amb');
  }
  drawGrass(canvas, frame * 2);

  const x = CAMPER_X;
  if (state.running) stamp(canvas, [EXHAUST_FRAMES[frame % EXHAUST_FRAMES.length]], x - 2, ROAD_ROW - 1, 'c-amb');
  stamp(canvas, camperSprite(WHEEL_FRAMES[frame % WHEEL_FRAMES.length]), x, CAMPER_Y, 'c-amb', true);

  // Punte dei pini in primo piano: scorrono al doppio della velocità della strada
  for (const tree of FG_TREES) {
    const treeX = mod(tree.x - frame * 2, FG_PERIOD) - 7;
    stamp(canvas, tree.sprite, treeX, H - tree.sprite.length, 'c-txt');
  }
}

// Pausa: campeggio in montagna, con la stessa strada, lo stesso orizzonte e la stessa erba della scena di viaggio.
function drawCamp(canvas) {
  STARS.forEach(([x, y], index) => {
    stamp(canvas, [STAR_FRAMES[(frame + index) % STAR_FRAMES.length]], x, y, 'c-amb');
  });
  stamp(canvas, MOUNTAINS, 0, HORIZON_ROW - MOUNTAIN_ROWS + 1, 'c-dim');
  stamp(canvas, [farEdgeLine(0)], 0, ROAD_ROW - 4, 'c-mut');

  stamp(canvas, PINE, 1, ROAD_ROW - 4, 'c-acc');
  stamp(canvas, PINE, 7, ROAD_ROW - 4, 'c-acc');
  stamp(canvas, TENT, 14, CAMPER_Y, 'c-txt');
  stamp(canvas, SMOKE_FRAMES[frame % SMOKE_FRAMES.length].slice(0, 2), 31, ROAD_ROW - 6, 'c-amb');
  stamp(canvas, FIRE_FRAMES[frame % FIRE_FRAMES.length], 30, ROAD_ROW - 4, 'c-amb');
  stamp(canvas, LOGS, 30, ROAD_ROW - 1, 'c-amb');
  stamp(canvas, camperSprite('-'), 37, CAMPER_Y, 'c-amb', true);
  stamp(canvas, PINE, W - 6, ROAD_ROW - 4, 'c-acc');

  stamp(canvas, ['='.repeat(W)], 0, ROAD_ROW, 'c-mut');
  drawGrass(canvas, 0);
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

function draw() {
  const canvas = createCanvas();
  const camping = state.mode !== 'work';
  if (camping) drawCamp(canvas);
  else drawRoad(canvas);
  artEl.innerHTML = toHTML(canvas);
  sceneEl.dataset.scene = camping ? 'camp' : 'road';
  sceneEl.setAttribute('aria-label', camping
    ? 'Pausa: il camper è parcheggiato in campeggio'
    : `Il camper è in viaggio: ${Math.round(state.progress * 100)}% del percorso`);
}

// ---------- Interfaccia per timer.js ----------

// Chiamata dal timer a ogni aggiornamento.
// progress: 0..1 della fase corrente; running: il timer sta correndo.
export function updateJourney(next) {
  state = next;
  draw();
}

// Avvia l'animazione: la scena si muove solo mentre il timer corre (sia in viaggio sia in campeggio).
// Con "riduci movimento" attivo la scena resta ferma (cambia solo la parte colorata della strada).
export function initJourney() {
  draw();
  setInterval(() => {
    if (reduceMotion.matches || !state.running) return;
    frame += 1;
    draw();
  }, 350);
}
