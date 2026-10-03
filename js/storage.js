// Unico punto dell'app che parla con il localStorage del browser.
// Gli altri file usano queste due funzioni, così se in futuro cambiamo
// il modo di salvare i dati (es. un database online) basta modificare qui.

const PREFIX = 'focusApp.';   // evita conflitti con altri siti/app sullo stesso browser

// Legge un valore salvato. Se non esiste (o è rovinato) restituisce `fallback`.
export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// Salva un valore (numero, testo, lista, oggetto…) convertendolo in testo JSON.
export function save(key, value) {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}
