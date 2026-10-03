// Tag colorati e pannello dei filtri.
// Questo modulo conosce solo i tag. Quando qualcosa cambia avvisa todo.js
// tramite le funzioni (callback) ricevute in initTags.

import { load, save } from './storage.js';

// Ogni tag è un oggetto: { id, name, color }
let tags = load('tags', []);
const activeFilter = new Set();   // id dei tag selezionati come filtro (non viene salvato)

const toggleButton = document.getElementById('tags-toggle');
const panel = document.getElementById('tags-panel');
const form = document.getElementById('tag-form');
const nameInput = document.getElementById('tag-name');
const colorInput = document.getElementById('tag-color');
const tagList = document.getElementById('tag-list');
const clearButton = document.getElementById('filter-clear');

export function getTags() {
  return tags;
}

export function getTag(id) {
  return tags.find((tag) => tag.id === id);
}

export function getActiveFilter() {
  return [...activeFilter];
}

// Crea l'elemento grafico di un tag (una "pillola" colorata).
// `element` può essere 'span' (solo visuale) o 'button' (cliccabile).
export function createTagChip(tag, element = 'span', active = false) {
  const chip = document.createElement(element);
  chip.className = 'tag' + (active ? ' active' : '');
  chip.style.setProperty('--tag-color', tag.color);   // il CSS usa questa variabile
  chip.textContent = tag.name;
  if (element === 'button') {
    chip.type = 'button';
    chip.setAttribute('aria-pressed', String(active));
  }
  return chip;
}

// ---------- Disegno del pannello ----------

function renderPanel() {
  tagList.replaceChildren();

  if (tags.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'Nessun tag ancora: creane uno qui sopra.';
    tagList.append(empty);
  }

  for (const tag of tags) {
    const item = document.createElement('span');
    item.className = 'tag-item';

    const chip = createTagChip(tag, 'button', activeFilter.has(tag.id));
    chip.dataset.action = 'filter';
    chip.dataset.tagId = tag.id;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'tag-remove';
    remove.dataset.action = 'delete-tag';
    remove.dataset.tagId = tag.id;
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Elimina il tag ${tag.name}`);

    item.append(chip, remove);
    tagList.append(item);
  }

  clearButton.hidden = activeFilter.size === 0;
  // Con il pannello chiuso, il pulsante ricorda quanti filtri sono attivi
  toggleButton.textContent =
    activeFilter.size > 0 ? `Tag e filtri (${activeFilter.size})` : 'Tag e filtri';
}

// ---------- Eventi ----------

// onChange: da chiamare quando filtri o tag cambiano (todo.js ridisegna le colonne)
// countUsage(id): quante task usano quel tag
// onTagDeleted(id): todo.js toglie il tag dalle task
export function initTags({ onChange, countUsage, onTagDeleted }) {
  renderPanel();

  toggleButton.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    toggleButton.setAttribute('aria-expanded', String(!panel.hidden));
  });

  // Creazione di un nuovo tag
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    if (tags.some((tag) => tag.name.toLowerCase() === name.toLowerCase())) {
      nameInput.setCustomValidity('Esiste già un tag con questo nome');
      nameInput.reportValidity();
      return;
    }
    tags.push({ id: crypto.randomUUID(), name, color: colorInput.value });
    save('tags', tags);
    nameInput.value = '';
    renderPanel();
    onChange();
  });

  // Toglie il messaggio di errore appena si modifica il nome
  nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));

  // Clic su un tag: lo seleziona/deseleziona come filtro. Clic su ×: lo elimina.
  tagList.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = button.dataset.tagId;

    if (button.dataset.action === 'filter') {
      if (activeFilter.has(id)) activeFilter.delete(id);
      else activeFilter.add(id);
    } else if (button.dataset.action === 'delete-tag') {
      const used = countUsage(id);
      if (used > 0 && !confirm(`Questo tag è usato da ${used} task. Eliminarlo comunque?`)) {
        return;
      }
      tags = tags.filter((tag) => tag.id !== id);
      activeFilter.delete(id);
      save('tags', tags);
      onTagDeleted(id);
    }
    renderPanel();
    onChange();
  });

  clearButton.addEventListener('click', () => {
    activeFilter.clear();
    renderPanel();
    onChange();
  });
}
