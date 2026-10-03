// Gestione del tema chiaro/scuro.
// Il tema è scritto come attributo sul tag <html>: data-theme="light" oppure "dark".
// Il CSS reagisce a quell'attributo cambiando i valori delle variabili colore.

import { load, save } from './storage.js';

const button = document.getElementById('theme-toggle');

// Applica un tema alla pagina e aggiorna l'icona del pulsante.
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  button.textContent = theme === 'dark' ? '☀️' : '🌙';   // mostra il tema a cui si passerebbe
}

// Se l'utente non ha ancora scelto, usa il tema del sistema operativo.
function getInitialTheme() {
  const saved = load('theme', null);
  if (saved) return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function initTheme() {
  applyTheme(getInitialTheme());

  // Al clic: inverte il tema e ricorda la scelta.
  button.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    save('theme', next);
  });
}
