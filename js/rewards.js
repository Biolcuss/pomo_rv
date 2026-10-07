// Reward system: si guadagnano punti completando task e pomodori di lavoro (le pause non danno nulla).
// - Task: i punti li sceglie l'utente per ogni task (vedi TASK_POINTS), default DEFAULT_TASK_POINTS.
// - Pomodoro di lavoro: 1 punto per ogni minuto di durata.
// Ogni LEVEL_SIZE punti si sale di livello.

import { load, save } from './storage.js';
import { playSound } from './sound.js';

export const TASK_POINTS = [5, 10, 15, 25, 50, 75, 100];   // valori selezionabili per una task
export const DEFAULT_TASK_POINTS = 10;
const LEVEL_SIZE = 100;

let state = { points: 0, tasks: 0, pomodoros: 0, ...load('rewards', {}) };

const pointsEl = document.getElementById('reward-points');
const levelEl = document.getElementById('reward-level');
const barEl = document.getElementById('reward-bar');
const widget = document.getElementById('reward-widget');

export function getRewards() {
  return { ...state, level: Math.floor(state.points / LEVEL_SIZE) + 1, levelSize: LEVEL_SIZE };
}

function render() {
  const level = Math.floor(state.points / LEVEL_SIZE) + 1;
  const inLevel = state.points % LEVEL_SIZE;
  pointsEl.textContent = state.points;
  levelEl.textContent = `Lv ${level}`;
  barEl.style.width = `${inLevel}%`;
  widget.title = `${state.points} punti · ${state.tasks} task completate · ${state.pomodoros} pomodori · ${LEVEL_SIZE - inLevel} punti al livello ${level + 1}`;
}

// Intensità dell'effetto da 0 (leggero, +5) a 1 (esagerato, +100). La radice quadrata
// rende ben distinguibili anche i valori bassi. Il CSS la usa tramite la variabile --fx.
function intensity(points) {
  return Math.sqrt(Math.min(1, Math.max(0, (points - 5) / 95)));
}

// Durata (ms) dell'animazione sulla task: più punti, più dura
export function effectDuration(points) {
  return Math.round(1000 + intensity(points) * 1200);
}

// Mostra "+N" che sale e svanisce dentro `anchor` (che deve avere position: relative)
function floatText(text, anchor, className, fx) {
  const note = document.createElement('span');
  note.className = className;
  note.textContent = text;
  note.style.setProperty('--fx', fx);
  anchor.append(note);
  note.addEventListener('animationend', () => note.remove());
}

// Scintille che schizzano in giro dal punto `anchor`: nessuna a +5, da 3 (+10) a 12 (+100)
function burst(anchor, fx) {
  const count = fx < 0.2 ? 0 : 2 + Math.round(fx * 10);
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI + Math.random() * 0.5;
    const distance = 25 + fx * 50 + Math.random() * 20;
    const spark = document.createElement('span');
    spark.className = 'fx-spark';
    spark.textContent = '✦';
    spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    spark.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
    anchor.append(spark);
    spark.addEventListener('animationend', () => spark.remove());
  }
}

function levelUpEffect(levelBefore) {
  if (Math.floor(state.points / LEVEL_SIZE) <= levelBefore) return;
  widget.classList.add('level-up');
  setTimeout(() => widget.classList.remove('level-up'), 1500);
}

function award(points, counter, taskEl) {
  const levelBefore = Math.floor(state.points / LEVEL_SIZE);
  state.points += points;
  state[counter] += 1;
  save('rewards', state);
  render();
  const fx = intensity(points);
  floatText(`+${points}`, widget, 'reward-float', fx);
  if (taskEl) {
    // Lo stesso feedback sulla task appena completata, proprio sull'etichetta dei punti:
    // scintille, etichetta che si ingrandisce e lampo del bordo (tutto scala con i punti)
    const badge = taskEl.querySelector('.points-badge') ?? taskEl;
    taskEl.style.setProperty('--fx', fx);
    taskEl.classList.add('just-rewarded');
    badge.classList.add('badge-pop');
    burst(badge, fx);
    setTimeout(() => {
      taskEl.classList.remove('just-rewarded');
      badge.classList.remove('badge-pop');
    }, effectDuration(points));
  }
  levelUpEffect(levelBefore);
}

// `taskEl` = elemento della task già ridisegnato, su cui mostrare l'animazione
export function rewardTask(points, taskEl) {
  award(points, 'tasks', taskEl);
  playSound('reward');
}

// Un punto per ogni minuto di lavoro. Suona già il campanello di fine lavoro.
export function rewardFocus(minutes) {
  award(minutes, 'pomodoros', null);
}

// Per il pannello impostazioni (test): aggiunge o toglie punti, mai sotto zero.
export function adjustPoints(delta) {
  const levelBefore = Math.floor(state.points / LEVEL_SIZE);
  state.points = Math.max(0, state.points + delta);
  save('rewards', state);
  render();
  floatText(delta >= 0 ? `+${delta}` : String(delta), widget, 'reward-float', intensity(Math.abs(delta)));
  if (delta > 0) levelUpEffect(levelBefore);
}

// Spende punti nel negozio. Ritorna false (senza fare nulla) se non bastano.
export function spendPoints(cost) {
  if (cost > state.points) return false;
  adjustPoints(-cost);
  return true;
}

// Azzera punti e statistiche
export function resetRewards() {
  state = { points: 0, tasks: 0, pomodoros: 0 };
  save('rewards', state);
  render();
}

export function initRewards() {
  render();
}
