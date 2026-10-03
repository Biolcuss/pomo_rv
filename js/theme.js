// Gestione del tema chiaro/scuro.
// Il tema è scritto come attributo sul tag <html>: data-theme="light" oppure "dark".
// Il CSS reagisce a quell'attributo cambiando i valori delle variabili colore.

import { load, save } from './storage.js';

const button = document.getElementById('theme-toggle');

// Icone del pulsante (SVG semplici, ereditano il colore del testo)
const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';

// Applica un tema alla pagina e aggiorna l'icona del pulsante.
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  button.innerHTML = theme === 'dark' ? SUN : MOON;   // mostra il tema a cui si passerebbe
  button.setAttribute('aria-label', theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro');
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
