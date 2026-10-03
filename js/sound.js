// Suoni e notifiche. I suoni sono generati al volo con la Web Audio API (piccole note sinusoidali):
// niente file audio da scaricare. Il pulsante nell'intestazione li attiva/disattiva (scelta ricordata).

import { load, save } from './storage.js';

let enabled = load('soundEnabled', true);
let audio = null;   // AudioContext, creato al primo clic dell'utente (i browser bloccano l'audio prima)

// Sequenze di note: [frequenza in Hz, ritardo in secondi, durata in secondi, forma d'onda, volume]
// (forma d'onda e volume sono facoltativi: default sinusoide a 0.25)
const SOUNDS = {
  workEnd: [[659, 0, 0.35], [784, 0.18, 0.35], [1047, 0.36, 0.7]],   // Mi-Sol-Do: arpeggio che sale
  breakEnd: [[784, 0, 0.3], [523, 0.22, 0.6]],                       // Sol-Do: scende, più morbido
  reward: [[988, 0, 0.12], [1319, 0.09, 0.3]],                       // "ding" breve: task completata
  move: [[175, 0, 0.09, 'sine', 0.3], [220, 0.07, 0.13, 'sine', 0.3]],  // task spostata di colonna: "bup" grave e morbido
  add: [[392, 0, 0.06, 'triangle'], [523, 0.05, 0.1, 'triangle']],      // task aggiunta
  delete: [[330, 0, 0.07, 'triangle'], [220, 0.06, 0.13, 'triangle']],  // task eliminata
  timerSkip: [[440, 0, 0.05, 'triangle'], [660, 0.05, 0.05, 'triangle'], [880, 0.1, 0.08, 'triangle']],
  shake: [[196, 0, 0.07, 'square', 0.07], [233, 0.07, 0.07, 'square', 0.07], [196, 0.14, 0.07, 'square', 0.07],
          [233, 0.21, 0.07, 'square', 0.07], [196, 0.28, 0.07, 'square', 0.07], [233, 0.35, 0.07, 'square', 0.07]],
  return: [[523, 0, 0.1, 'triangle'], [392, 0.09, 0.22, 'triangle']],  // task ripetibile che torna in To-do
  timerStart: [[523, 0, 0.08], [784, 0.07, 0.15]],                   // su
  timerPause: [[784, 0, 0.08], [523, 0.07, 0.15]],                   // giù
  timerReset: [[392, 0, 0.07], [330, 0.07, 0.07], [262, 0.14, 0.18]],
};

const button = document.getElementById('sound-toggle');
const ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>';

// I browser permettono di suonare solo dopo un gesto dell'utente (clic o tasto): al primo gesto
// qualsiasi sulla pagina creiamo/sblocchiamo l'AudioContext.
export function unlockAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume();
  } catch { /* audio non supportato: l'app funziona lo stesso */ }
}

// Chiede il permesso per le notifiche (va chiamata da un clic, per questo la usa il pulsante Avvia)
export function askNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function playSound(name) {
  if (!enabled || !audio) return;
  if (audio.state === 'suspended') audio.resume();
  const start = audio.currentTime + 0.02;
  for (const [freq, delay, length, type = 'sine', volume = 0.25] of SOUNDS[name]) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    // Attacco rapido e dissolvenza: niente "click" all'inizio e alla fine della nota
    gain.gain.setValueAtTime(0.0001, start + delay);
    gain.gain.exponentialRampToValueAtTime(volume, start + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + delay + length);
    osc.connect(gain).connect(audio.destination);
    osc.start(start + delay);
    osc.stop(start + delay + length + 0.05);
  }
}

// Notifica del browser: solo se il permesso è stato dato e la scheda non è in primo piano.
export function notify(title, body) {
  if (!enabled || !('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;
  new Notification(title, { body });
}

function renderButton() {
  button.innerHTML = enabled ? ON : OFF;
  button.setAttribute('aria-label', enabled ? 'Disattiva i suoni' : 'Attiva i suoni');
  button.setAttribute('aria-pressed', String(!enabled));
}

export function initSound() {
  renderButton();
  // Il primo gesto dell'utente sblocca l'audio, così i suoni funzionano subito, qualunque cosa si faccia per prima
  for (const type of ['pointerdown', 'keydown']) {
    document.addEventListener(type, unlockAudio, { once: true });
  }
  button.addEventListener('click', () => {
    enabled = !enabled;
    save('soundEnabled', enabled);
    renderButton();
    unlockAudio();
    if (enabled) playSound('reward');   // piccolo "ding" di conferma
  });
}
