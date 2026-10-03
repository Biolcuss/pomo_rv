// Scena in ASCII art accanto al timer: un camper che viaggia dal punto A al punto B.
// - Lavoro: il camper avanza sulla strada in base al progresso del pomodoro.
// - Pausa: il camper è parcheggiato in campeggio, con montagne, falò e stelle.
//
// Come funziona il disegno: una "tela" è una griglia di celle { ch, cls } (carattere + colore).
// Gli sprite (piccoli disegni fatti di righe di testo) vengono "timbrati" sulla tela,
// poi la tela diventa HTML: ogni gruppo di celle dello stesso colore è uno <span>.

const W = 64;   // colonne
const H = 13;   // righe

const artEl = document.getElementById('scene-art');
const sceneEl = document.getElementById('scene-section');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let state = { mode: 'work', progress: 0, running: false };
let frame = 0;

// ---------- Sprite ----------
// "W" nelle ruote viene sostituito dal carattere del fotogramma (la ruota gira).
const CAMPER = [
  " .--------.__  ",
  " | [] []  |  '.",
  " '-(W)----(W)-'",
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
const FAR_HILLS = [
  '                 /\\                                 /\\         ',
  '        /\\      /  \\            /\\                 /  \\    /\\  ',
  '       /  \\    /    \\    /\\    /  \\       /\\      /    \\  /  \\ ',
  '  /\\  /    \\  /      \\  /  \\  /    \\     /  \\    /      \\/    \\',
  ' /  \\/      \\/        \\/    \\/      \\___/    \\__/             ',
];
const FLAG_A = ['A ', '|>', '| ', '| '];
const FLAG_B = [' B', '|>', '| ', '| '];

const MOUNTAINS = [
  '                       /\\                                       ',
  '             /\\       /  \\                   /\\                 ',
  '            /  \\     / /\\ \\        /\\       /  \\       /\\       ',
  '      /\\   / /\\ \\   / /  \\ \\      /  \\     / /\\ \\     /  \\      ',
  '     /  \\ / /  \\ \\ / /    \\ \\    / /\\ \\   / /  \\ \\   / /\\ \\     ',
  '    / /\\ \\ /    \\ / /      \\ \\  / /  \\ \\ / /    \\ \\ / /  \\ \\    ',
  '___/_/__\\_\\______\\_/________\\_\\/_/____\\_\\_/______\\_\\_/____\\_\\___',
];
const MOON = [
  '  _.',
  ' /  |',
  ' \\__|',
];
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
const STARS = [[3, 0], [11, 1], [19, 0], [31, 0], [38, 1], [45, 0], [61, 1], [7, 2], [29, 2]];
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

// Lavoro: strada da A a B, il camper avanza con il progresso del pomodoro.
function drawRoad(canvas) {
  stamp(canvas, SUN, W - 9, 0, 'c-amb');
  // Le nuvole scorrono all'indietro mentre si viaggia
  stamp(canvas, CLOUD, mod(8 - frame, W + 8) - 8, 1, 'c-mut');
  stamp(canvas, CLOUD, mod(36 - frame, W + 8) - 8, 3, 'c-mut');
  stamp(canvas, FAR_HILLS, 0, 4, 'c-dim');

  stamp(canvas, FLAG_A, 1, 7, 'c-txt');
  stamp(canvas, FLAG_B, W - 3, 7, 'c-amb');

  // Strada e linee di mezzeria che scorrono
  stamp(canvas, ['='.repeat(W)], 0, 11, 'c-mut');
  stamp(canvas, [Array.from({ length: W }, (_, i) => ((i + frame) % 4 < 2 ? '-' : ' ')).join('')], 0, 12, 'c-dim');

  const start = 3;
  const end = W - 4 - CAMPER_W;
  const x = start + Math.round(state.progress * (end - start));
  if (state.running) stamp(canvas, [EXHAUST_FRAMES[frame % EXHAUST_FRAMES.length]], x - 2, 10, 'c-mut');
  stamp(canvas, camperSprite(WHEEL_FRAMES[frame % WHEEL_FRAMES.length]), x, 8, 'c-acc', true);
}

// Pausa: campeggio in montagna.
function drawCamp(canvas) {
  STARS.forEach(([x, y], index) => {
    stamp(canvas, [STAR_FRAMES[(frame + index) % STAR_FRAMES.length]], x, y, 'c-mut');
  });
  stamp(canvas, MOON, W - 9, 0, 'c-amb');
  stamp(canvas, MOUNTAINS, 0, 1, 'c-dim');

  stamp(canvas, PINE, 1, 8, 'c-acc');
  stamp(canvas, PINE, 7, 8, 'c-acc');
  stamp(canvas, TENT, 14, 9, 'c-txt');
  stamp(canvas, SMOKE_FRAMES[frame % SMOKE_FRAMES.length], 26, 5, 'c-mut');
  stamp(canvas, FIRE_FRAMES[frame % FIRE_FRAMES.length], 25, 8, 'c-amb');
  stamp(canvas, LOGS, 25, 11, 'c-txt');
  stamp(canvas, camperSprite('-'), 36, 9, 'c-acc', true);
  stamp(canvas, PINE, W - 6, 8, 'c-acc');

  // Erba
  stamp(canvas, [Array.from({ length: W }, (_, i) => ".,'"[(i * 7) % 3]).join('')], 0, 12, 'c-dim');
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
    : `Viaggio del camper dal punto A al punto B: ${Math.round(state.progress * 100)}%`);
}

// ---------- Interfaccia per timer.js ----------

// Chiamata dal timer a ogni aggiornamento.
// progress: 0..1 della fase corrente; running: il timer sta correndo.
export function updateJourney(next) {
  state = next;
  draw();
}

// Avvia l'animazione: la scena si muove solo mentre il timer corre (sia in viaggio sia in campeggio).
// Con "riduci movimento" attivo la scena resta ferma (cambia solo la posizione del camper).
export function initJourney() {
  draw();
  setInterval(() => {
    if (reduceMotion.matches || !state.running) return;
    frame += 1;
    draw();
  }, 350);
}
