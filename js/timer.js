// Pomodoro timer: avvio, pausa, reset, salto, cicli automatici e durate personalizzabili.
// Il tempo non si calcola "contando i tick": si memorizza l'istante di fine e a ogni tick
// si calcola quanto manca. Così il timer resta preciso anche se la scheda è in background
// (dove il browser rallenta i timer).

import { load, save } from './storage.js';

// Durate in minuti. `cycles` = quanti pomodori di lavoro prima della pausa lunga.
const DEFAULTS = { work: 25, shortBreak: 5, longBreak: 15, cycles: 4 };
const LIMITS = {
  work: [1, 90],
  shortBreak: [1, 90],
  longBreak: [1, 90],
  cycles: [2, 12],
};
const MODE_LABELS = { work: 'Lavoro', shortBreak: 'Pausa breve', longBreak: 'Pausa lunga' };

let settings = { ...DEFAULTS, ...load('timerSettings', {}) };
let draft = { ...settings };   // valori mostrati nel pannello: diventano effettivi solo con Salva

// Preimpostazioni: quella di fabbrica non si può eliminare; le altre le crea l'utente.
const BUILTIN_PRESET = { id: 'classic', name: 'Classico', ...DEFAULTS };
let presets = load('timerPresets', []);

let mode = 'work';          // 'work' | 'shortBreak' | 'longBreak'
let cycle = 1;              // pomodoro corrente (1..settings.cycles)
let remaining = 0;          // secondi rimasti (valido quando il timer non sta correndo)
let endTime = 0;            // istante (ms) in cui finisce la fase, solo mentre corre
let intervalId = null;      // non null = il timer sta correndo

const modeEl = document.getElementById('timer-mode');
const displayEl = document.getElementById('timer-display');
const cycleEl = document.getElementById('timer-cycle');
const startButton = document.getElementById('timer-start');
const resetButton = document.getElementById('timer-reset');
const skipButton = document.getElementById('timer-skip');
const settingsToggle = document.getElementById('timer-settings-toggle');
const panel = document.getElementById('timer-panel');
const panelClose = document.getElementById('timer-panel-close');
const settingsForm = document.getElementById('timer-settings');
const saveButton = document.getElementById('timer-save');
const presetList = document.getElementById('preset-list');
const presetForm = document.getElementById('preset-form');
const presetName = document.getElementById('preset-name');

function phaseSeconds(forMode) {
  return settings[forMode] * 60;
}

function isRunning() {
  return intervalId !== null;
}

// ---------- Disegno ----------

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function render() {
  modeEl.textContent = MODE_LABELS[mode];
  displayEl.textContent = formatTime(remaining);
  cycleEl.textContent = `Ciclo ${cycle} di ${settings.cycles}`;
  // Un solo pulsante che cambia etichetta: Avvia / Pausa / Riprendi
  const started = remaining < phaseSeconds(mode);
  startButton.textContent = isRunning() ? 'Pausa' : started ? 'Riprendi' : 'Avvia';
  document.documentElement.dataset.timerMode = mode;   // il CSS può colorare in base alla fase
}

// ---------- Controllo del timer ----------

function tick() {
  remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
  render();
  if (remaining === 0) nextPhase(true);
}

function start() {
  if (isRunning()) return;
  endTime = Date.now() + remaining * 1000;
  intervalId = setInterval(tick, 250);   // controlla spesso, così lo scatto del secondo è puntuale
  render();
}

function pause() {
  if (!isRunning()) return;
  // Aggiorna `remaining` all'istante esatto della pausa (almeno 1s: a 0 la fase sarebbe già finita)
  remaining = Math.max(1, Math.round((endTime - Date.now()) / 1000));
  stop();
  render();
}

function stop() {
  clearInterval(intervalId);
  intervalId = null;
}

// Passa alla fase successiva: lavoro → pausa (lunga ogni N cicli) → lavoro…
// `autoStart` = true quando la fase è finita da sola: la successiva parte subito.
function nextPhase(autoStart) {
  stop();
  if (mode === 'work') {
    mode = cycle >= settings.cycles ? 'longBreak' : 'shortBreak';
  } else {
    // Dopo la pausa lunga il giro ricomincia da 1
    cycle = mode === 'longBreak' ? 1 : cycle + 1;
    mode = 'work';
  }
  remaining = phaseSeconds(mode);
  render();
  if (autoStart) start();
}

// Torna all'inizio: primo ciclo, fase di lavoro, tempo pieno.
function reset() {
  stop();
  mode = 'work';
  cycle = 1;
  remaining = phaseSeconds(mode);
  render();
}

// ---------- Impostazioni ----------
// Il pannello lavora su `draft` (bozza). `settings` (quelle in uso) cambia solo con Salva.

const KEYS = Object.keys(DEFAULTS);

function sameValues(a, b) {
  return KEYS.every((key) => a[key] === b[key]);
}

// Porta un valore nei limiti consentiti (se non è un numero usa il predefinito).
function clampSetting(key, raw) {
  const [min, max] = LIMITS[key];
  const value = Math.round(Number(raw));
  return Number.isFinite(value) && raw !== '' ? Math.min(max, Math.max(min, value)) : DEFAULTS[key];
}

// Mostra la bozza nei controlli (cursore + numero) e aggiorna la parte colorata dei cursori.
function fillSettingsForm() {
  for (const key of KEYS) {
    for (const input of settingsForm.querySelectorAll(`[data-key="${key}"]`)) {
      input.value = draft[key];
    }
    updateSliderFill(key);
  }
  saveButton.disabled = sameValues(draft, settings);   // niente da salvare = pulsante spento
  renderPresets();
}

function updateSliderFill(key) {
  const slider = settingsForm.querySelector(`[data-key="${key}"][data-role="range"]`);
  const [min, max] = LIMITS[key];
  slider.style.setProperty('--fill', `${((slider.value - min) / (max - min)) * 100}%`);
}

// Salva la bozza come impostazioni in uso e resetta il timer, così non resta "a metà".
function saveSettings() {
  settings = { ...draft };
  save('timerSettings', settings);
  reset();
  fillSettingsForm();
  setPanelOpen(false);
}

// ---------- Preimpostazioni ----------

function renderPresets() {
  presetList.replaceChildren();
  for (const preset of [BUILTIN_PRESET, ...presets]) {
    const item = document.createElement('div');
    item.className = 'preset' + (sameValues(preset, draft) ? ' active' : '');

    const loadButton = document.createElement('button');
    loadButton.type = 'button';
    loadButton.className = 'preset-load';
    loadButton.dataset.id = preset.id;
    loadButton.title = `Lavoro ${preset.work} · pausa ${preset.shortBreak} · pausa lunga ${preset.longBreak} · ${preset.cycles} cicli`;
    loadButton.textContent = preset.name;
    const detail = document.createElement('small');
    detail.textContent = `${preset.work}/${preset.shortBreak}/${preset.longBreak}`;
    loadButton.append(detail);
    item.append(loadButton);

    if (preset !== BUILTIN_PRESET) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'preset-delete';
      del.dataset.id = preset.id;
      del.setAttribute('aria-label', `Elimina preimpostazione ${preset.name}`);
      del.textContent = '✕';
      item.append(del);
    }
    presetList.append(item);
  }
}

// Salva la bozza attuale come preimpostazione (se il nome esiste già, la aggiorna).
function savePreset(name) {
  const values = Object.fromEntries(KEYS.map((key) => [key, draft[key]]));
  const existing = presets.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (existing) Object.assign(existing, values);
  else presets.push({ id: crypto.randomUUID(), name, ...values });
  save('timerPresets', presets);
  renderPresets();
}

// ---------- Pannello ----------

// Apre/chiude il cassetto (stessa tecnica del pannello tag: classe "open" + `inert`).
// Chiudendo senza salvare, la bozza viene scartata.
function setPanelOpen(open) {
  panel.classList.toggle('open', open);
  panel.inert = !open;
  settingsToggle.setAttribute('aria-expanded', String(open));
  draft = { ...settings };
  fillSettingsForm();
  if (open) panelClose.focus();
}

export function initTimer() {
  remaining = phaseSeconds(mode);
  fillSettingsForm();
  render();

  startButton.addEventListener('click', () => (isRunning() ? pause() : start()));
  resetButton.addEventListener('click', reset);
  skipButton.addEventListener('click', () => nextPhase(isRunning()));

  settingsToggle.addEventListener('click', () => setPanelOpen(!panel.classList.contains('open')));
  panelClose.addEventListener('click', () => setPanelOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !panel.classList.contains('open')) return;
    if (panel.contains(event.target) || event.target === document.body) setPanelOpen(false);
  });

  // Mentre si trascina il cursore o si scrive, il valore accanto si aggiorna subito (evento "input")
  settingsForm.addEventListener('input', (event) => {
    const { key, role } = event.target.dataset;
    if (!key || event.target.value === '') return;
    settingsForm.querySelector(`[data-key="${key}"]:not([data-role="${role}"])`).value = event.target.value;
    if (role === 'range') {
      draft[key] = clampSetting(key, event.target.value);
      fillSettingsForm();
    }
  });

  // Il campo numerico si conferma a fine modifica (Invio o perdita del focus: evento "change")
  settingsForm.addEventListener('change', (event) => {
    const { key } = event.target.dataset;
    if (!key) return;
    draft[key] = clampSetting(key, event.target.value);
    fillSettingsForm();   // mostra anche l'eventuale valore corretto
  });
  settingsForm.addEventListener('submit', (event) => event.preventDefault());

  saveButton.addEventListener('click', saveSettings);

  // Clic su una preimpostazione: carica i valori nella bozza (poi serve Salva). ✕ la elimina.
  presetList.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.classList.contains('preset-delete')) {
      presets = presets.filter((p) => p.id !== button.dataset.id);
      save('timerPresets', presets);
    } else {
      const preset = [BUILTIN_PRESET, ...presets].find((p) => p.id === button.dataset.id);
      draft = Object.fromEntries(KEYS.map((key) => [key, preset[key]]));
    }
    fillSettingsForm();
  });

  presetForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = presetName.value.trim();
    if (!name) return;
    savePreset(name);
    presetName.value = '';
  });
}
