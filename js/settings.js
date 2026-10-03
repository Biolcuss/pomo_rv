// Pannello impostazioni (cassetto laterale, come quello dei tag e del timer).
// Per ora serve a testare il reward system: aggiungere/rimuovere punti e azzerare il livello.

import { getRewards, adjustPoints, resetRewards } from './rewards.js';

const toggle = document.getElementById('settings-toggle');
const panel = document.getElementById('settings-panel');
const closeButton = document.getElementById('settings-close');
const statsEl = document.getElementById('settings-stats');
const form = document.getElementById('points-form');
const amountInput = document.getElementById('points-amount');
const resetButton = document.getElementById('rewards-reset');

function renderStats() {
  const { points, level, tasks, pomodoros } = getRewards();
  statsEl.textContent = `${points} punti · livello ${level} · ${tasks} task · ${pomodoros} pomodori`;
}

function setOpen(open) {
  panel.classList.toggle('open', open);
  panel.inert = !open;
  toggle.setAttribute('aria-expanded', String(open));
  if (open) {
    renderStats();
    closeButton.focus();
  }
}

export function initSettings() {
  toggle.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  closeButton.addEventListener('click', () => setOpen(false));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && panel.classList.contains('open')) setOpen(false);
  });

  // Clic fuori dal pannello (e fuori dal suo pulsante) lo chiude
  document.addEventListener('pointerdown', (event) => {
    if (!panel.classList.contains('open')) return;
    if (panel.contains(event.target) || toggle.contains(event.target)) return;
    setOpen(false);
  });

  // "Aggiungi" e "Rimuovi" sono due pulsanti submit: event.submitter dice quale è stato premuto
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const amount = Math.round(Number(amountInput.value));
    if (!Number.isFinite(amount) || amount < 1) return;
    adjustPoints(event.submitter?.dataset.op === 'remove' ? -amount : amount);
    renderStats();
  });

  resetButton.addEventListener('click', () => {
    if (!confirm('Azzerare punti, livello e statistiche?')) return;
    resetRewards();
    renderStats();
  });
}
